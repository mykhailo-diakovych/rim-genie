import { Effect } from "effect";
import { eq, sql, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { lineTotalCents } from "@rim-genie/db/line-item";
import { SENT_TO_CASHIER_STATUS } from "@rim-genie/db/quote-status";
import { quote, invoice, invoiceItem, payment, job } from "@rim-genie/db/schema";
import type { InvoiceStatus } from "@rim-genie/db/schema";

import {
  QuoteNotFound,
  QuoteHasNoItems,
  InvoiceNotFound,
  InvoiceHasPayments,
  InvoiceHasJobs,
  InvoiceTotalBelowPaid,
  QuoteNotFinalized,
} from "./errors";

// The invoice (and with it anything the cashier and technicians see) only comes into being
// here, when the floor explicitly sends a finalized quote 
export function sendQuoteToCashier(quoteId: string, userId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.quote.findFirst({ where: eq(quote.id, quoteId), columns: { status: true } }),
    );

    if (!found) {
      return yield* Effect.fail(new QuoteNotFound({ id: quoteId }));
    }
    if (found.status !== "finalized") {
      return yield* Effect.fail(new QuoteNotFinalized({ quoteId }));
    }

    const inv = yield* syncInvoiceFromQuote(quoteId, userId);
    yield* Effect.tryPromise(() =>
      db
        .update(quote)
        .set({ status: SENT_TO_CASHIER_STATUS, sentToCashierAt: new Date() })
        .where(eq(quote.id, quoteId)),
    );
    return inv;
  });
}

// The one place an invoice total is worked out. Every path that changes it goes through here,
// so an edit can never take the total below what has already been collected
// An unchanged total passes, which leaves invoices that are already overpaid as they are.
function settleInvoiceTotals(
  invoiceId: string,
  previousTotal: number,
  parts: { subtotal: number; discount: number; tax: number },
) {
  return Effect.gen(function* () {
    const [paidRow] = yield* Effect.tryPromise(() =>
      db
        .select({ paid: sum(payment.amount) })
        .from(payment)
        .where(eq(payment.invoiceId, invoiceId)),
    );
    const paid = Number(paidRow?.paid ?? 0);
    const total = parts.subtotal - parts.discount + parts.tax;

    if (total < paid && total !== previousTotal) {
      return yield* Effect.fail(new InvoiceTotalBelowPaid({ invoiceId, paid }));
    }

    const status: InvoiceStatus =
      paid >= total && total > 0 ? "paid" : paid > 0 ? "partially_paid" : "unpaid";
    return { ...parts, total, status };
  });
}

export function syncInvoiceFromQuote(quoteId: string, userId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.quote.findFirst({
        where: eq(quote.id, quoteId),
        with: {
          customer: true,
          items: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
          invoice: true,
        },
      }),
    );

    if (!found) {
      return yield* Effect.fail(new QuoteNotFound({ id: quoteId }));
    }

    // Excluded lines were recommended and declined: they stay on the quote for the record but
    // never become invoice items, jobs, or part of any total.
    const billableItems = found.items.filter((i) => !i.isExcluded);

    if (billableItems.length === 0) {
      return yield* Effect.fail(new QuoteHasNoItems({ quoteId }));
    }

    const subtotal = billableItems.reduce((s, i) => s + lineTotalCents(i), 0);
    const discountAmount = found.discountAmount;
    const total = subtotal - discountAmount;

    if (!found.invoice) {
      const result = yield* Effect.tryPromise(() =>
        db.transaction(async (tx) => {
          const [inv] = await tx
            .insert(invoice)
            .values({
              quoteId,
              customerId: found.customerId,
              status: "unpaid",
              subtotal,
              discount: discountAmount,
              tax: 0,
              total,
              createdById: userId,
              // The branch that took the work in, carried over from the quote so the
              // invoice never has to re-derive it from the creator's profile.
              locationId: found.locationId,
            })
            .returning();

          await tx.insert(invoiceItem).values(
            billableItems.map((item) => ({
              invoiceId: inv!.id,
              quoteItemId: item.id,
              itemType: item.itemType,
              vehicleSize: item.vehicleSize,
              sideOfVehicle: item.sideOfVehicle,
              damageLevel: item.damageLevel,
              vehicleType: item.vehicleType,
              rimMaterial: item.rimMaterial,
              quantity: item.quantity,
              unitCost: item.unitCost,
              inches: item.inches,
              tireSize: item.tireSize,
              jobTypes: item.jobTypes,
              description: item.description,
              comments: item.comments,
              priceOverridden: item.priceOverridden,
              sortOrder: item.sortOrder,
            })),
          );

          return inv!;
        }),
      );

      return result;
    }

    const invoiceId = found.invoice.id;
    const totals = yield* settleInvoiceTotals(invoiceId, found.invoice.total, {
      subtotal,
      discount: discountAmount,
      tax: found.invoice.tax,
    });

    const result = yield* Effect.tryPromise(() =>
      db.transaction(async (tx) => {
        await tx.delete(job).where(eq(job.invoiceId, invoiceId));
        await tx.delete(invoiceItem).where(eq(invoiceItem.invoiceId, invoiceId));

        await tx.insert(invoiceItem).values(
          billableItems.map((item) => ({
            invoiceId,
            quoteItemId: item.id,
            itemType: item.itemType,
            vehicleSize: item.vehicleSize,
            sideOfVehicle: item.sideOfVehicle,
            damageLevel: item.damageLevel,
            vehicleType: item.vehicleType,
            rimMaterial: item.rimMaterial,
            quantity: item.quantity,
            unitCost: item.unitCost,
            inches: item.inches,
            tireSize: item.tireSize,
            jobTypes: item.jobTypes,
            description: item.description,
            comments: item.comments,
            priceOverridden: item.priceOverridden,
            sortOrder: item.sortOrder,
          })),
        );

        const [inv] = await tx
          .update(invoice)
          .set(totals)
          .where(eq(invoice.id, invoiceId))
          .returning();

        return inv!;
      }),
    );

    return result;
  });
}

export function updateInvoice(
  invoiceId: string,
  fields: { notes?: string; discount?: number; tax?: number },
) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) }),
    );

    if (!found) {
      return yield* Effect.fail(new InvoiceNotFound({ id: invoiceId }));
    }

    const totals = yield* settleInvoiceTotals(invoiceId, found.total, {
      subtotal: found.subtotal,
      discount: fields.discount ?? found.discount,
      tax: fields.tax ?? found.tax,
    });

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(invoice)
        .set({ notes: fields.notes ?? found.notes, ...totals })
        .where(eq(invoice.id, invoiceId))
        .returning(),
    );

    return updated!;
  });
}

export function deleteInvoice(invoiceId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) }),
    );

    if (!found) {
      return yield* Effect.fail(new InvoiceNotFound({ id: invoiceId }));
    }

    const [paymentRow] = yield* Effect.tryPromise(() =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payment)
        .where(eq(payment.invoiceId, invoiceId)),
    );

    if (paymentRow && paymentRow.count > 0) {
      return yield* Effect.fail(new InvoiceHasPayments({ invoiceId }));
    }

    const [jobRow] = yield* Effect.tryPromise(() =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(job)
        .where(eq(job.invoiceId, invoiceId)),
    );

    if (jobRow && jobRow.count > 0) {
      return yield* Effect.fail(new InvoiceHasJobs({ invoiceId }));
    }

    yield* Effect.tryPromise(() =>
      db.transaction(async (tx) => {
        await tx.delete(invoiceItem).where(eq(invoiceItem.invoiceId, invoiceId));
        await tx.delete(invoice).where(eq(invoice.id, invoiceId));
        await tx
          .update(quote)
          .set({ status: "pending", sentToCashierAt: null })
          .where(eq(quote.id, found.quoteId));
      }),
    );

    return { success: true as const };
  });
}

export function recalcInvoiceStatus(invoiceId: string) {
  return Effect.tryPromise(async () => {
    const [inv] = await db
      .select({ total: invoice.total })
      .from(invoice)
      .where(eq(invoice.id, invoiceId));

    if (!inv) return;

    const [result] = await db
      .select({ paid: sum(payment.amount) })
      .from(payment)
      .where(eq(payment.invoiceId, invoiceId));

    const paid = Number(result?.paid ?? 0);
    const status = paid >= inv.total ? "paid" : paid > 0 ? "partially_paid" : "unpaid";

    await db.update(invoice).set({ status }).where(eq(invoice.id, invoiceId));
  });
}
