import { Effect } from "effect";
import { and, eq, sql, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { lineTotalCents } from "@rim-genie/db/line-item";
import { quote, invoice, invoiceItem, payment, job } from "@rim-genie/db/schema";

import {
  QuoteNotFound,
  QuoteHasNoItems,
  InvoiceNotFound,
  InvoiceHasPayments,
  InvoiceHasJobs,
} from "./errors";

export function createFromQuote(quoteId: string, userId: string) {
  return Effect.gen(function* () {
    // Ensure the invoice mirror reflects the latest quote items (creating it on the
    // first conversion, re-syncing it otherwise), then finalize the quote. Idempotent:
    // safe to call whether or not an invoice already exists.
    const inv = yield* syncInvoiceFromQuote(quoteId, userId);
    yield* Effect.tryPromise(() =>
      db.update(quote).set({ status: "completed" }).where(eq(quote.id, quoteId)),
    );
    return inv;
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

        const [paymentResult] = await tx
          .select({ paid: sum(payment.amount) })
          .from(payment)
          .where(eq(payment.invoiceId, invoiceId));

        const paid = Number(paymentResult?.paid ?? 0);
        const status = paid >= total && total > 0 ? "paid" : paid > 0 ? "partially_paid" : "unpaid";

        const [inv] = await tx
          .update(invoice)
          .set({ subtotal, discount: discountAmount, total, status })
          .where(eq(invoice.id, invoiceId))
          .returning();

        return inv!;
      }),
    );

    return result;
  });
}

// Surgical alternative to syncInvoiceFromQuote: touches only the one row and the invoice
// totals, avoiding a full re-sync that would recreate jobs and overwrite the cashier's discount.
export async function mirrorQuoteItemPrice(
  quoteItemId: string,
  unitCost: number,
  priceOverridden: boolean,
  previousQuoteDiscount: number,
): Promise<void> {
  const [row] = await db
    .select({ invoiceId: invoiceItem.invoiceId, quoteId: invoice.quoteId })
    .from(invoiceItem)
    .innerJoin(invoice, eq(invoice.id, invoiceItem.invoiceId))
    .where(eq(invoiceItem.quoteItemId, quoteItemId))
    .limit(1);

  if (!row) return;

  await db
    .update(invoiceItem)
    .set({ unitCost, priceOverridden })
    .where(eq(invoiceItem.quoteItemId, quoteItemId));

  // Follows the quote discount only while it still equals the previous quote-derived value;
  // a cashier-typed discount survives.
  const [q] = await db
    .select({ discountAmount: quote.discountAmount })
    .from(quote)
    .where(eq(quote.id, row.quoteId));

  if (q) {
    await db
      .update(invoice)
      .set({ discount: q.discountAmount })
      .where(and(eq(invoice.id, row.invoiceId), eq(invoice.discount, previousQuoteDiscount)));
  }

  await recalcInvoiceTotals(row.invoiceId);
}

export async function recalcInvoiceTotals(invoiceId: string): Promise<void> {
  const items = await db
    .select({
      itemType: invoiceItem.itemType,
      quantity: invoiceItem.quantity,
      unitCost: invoiceItem.unitCost,
      inches: invoiceItem.inches,
      priceOverridden: invoiceItem.priceOverridden,
    })
    .from(invoiceItem)
    .where(eq(invoiceItem.invoiceId, invoiceId));

  const subtotal = items.reduce((sum, item) => sum + lineTotalCents(item), 0);

  const [found] = await db
    .select({ discount: invoice.discount, tax: invoice.tax })
    .from(invoice)
    .where(eq(invoice.id, invoiceId));

  if (!found) return;

  const total = subtotal - found.discount + found.tax;

  const [paymentResult] = await db
    .select({ paid: sum(payment.amount) })
    .from(payment)
    .where(eq(payment.invoiceId, invoiceId));

  const paid = Number(paymentResult?.paid ?? 0);
  const status = paid >= total && total > 0 ? "paid" : paid > 0 ? "partially_paid" : "unpaid";

  await db.update(invoice).set({ subtotal, total, status }).where(eq(invoice.id, invoiceId));
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

    const discount = fields.discount ?? found.discount;
    const tax = fields.tax ?? found.tax;
    const total = found.subtotal - discount + tax;

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(invoice)
        .set({
          notes: fields.notes ?? found.notes,
          discount,
          tax,
          total,
        })
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
        await tx.update(quote).set({ status: "pending" }).where(eq(quote.id, found.quoteId));
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
