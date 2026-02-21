import { Effect } from "effect";
import { eq, sql, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { quote, invoice, invoiceItem, payment, job } from "@rim-genie/db/schema";

import {
  QuoteNotFound,
  QuoteAlreadyConverted,
  InvoiceNotFound,
  InvoiceHasPayments,
  InvoiceHasJobs,
} from "./errors";

export function createFromQuote(quoteId: string, userId: string) {
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

    if (found.invoice) {
      return yield* Effect.fail(new QuoteAlreadyConverted({ quoteId }));
    }

    const subtotal = found.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const customerDiscount =
      found.customer.isVip && found.customer.discount ? found.customer.discount : 0;
    const discountAmount = Math.round((subtotal * customerDiscount) / 100);
    const total = subtotal - discountAmount;

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
          })
          .returning();

        if (found.items.length > 0) {
          await tx.insert(invoiceItem).values(
            found.items.map((item) => ({
              invoiceId: inv!.id,
              vehicleSize: item.vehicleSize,
              sideOfVehicle: item.sideOfVehicle,
              damageLevel: item.damageLevel,
              quantity: item.quantity,
              unitCost: item.unitCost,
              jobTypes: item.jobTypes,
              description: item.description,
              comments: item.comments,
              sortOrder: item.sortOrder,
            })),
          );
        }

        await tx.update(quote).set({ status: "completed" }).where(eq(quote.id, quoteId));

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
