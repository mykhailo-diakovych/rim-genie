import { Effect } from "effect";
import { eq, inArray, sql, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { lineTotalCents } from "@rim-genie/db/line-item";
import { SENT_TO_CASHIER_STATUS } from "@rim-genie/db/quote-status";
import { quote, invoice, invoiceAuditEvent, invoiceItem, payment, job } from "@rim-genie/db/schema";
import type { InvoiceLineChange, InvoiceLineSnapshot, InvoiceStatus } from "@rim-genie/db/schema";

import {
  QuoteNotFound,
  QuoteHasNoItems,
  InvoiceNotFound,
  InvoiceHasPayments,
  InvoiceHasJobs,
  InvoiceLinesHaveStartedJobs,
  InvoiceTotalBelowPaid,
  QuoteNotFinalized,
} from "./errors";

// The invoice (and with it anything the cashier and technicians see) only comes into being
// here, when the floor explicitly sends a finalized quote
export function sendQuoteToCashier(quoteId: string, userId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.quote.findFirst({
        where: eq(quote.id, quoteId),
        columns: { status: true },
        with: { invoice: { columns: { id: true } } },
      }),
    );

    if (!found) {
      return yield* Effect.fail(new QuoteNotFound({ id: quoteId }));
    }
    if (found.status !== "finalized") {
      return yield* Effect.fail(new QuoteNotFinalized({ quoteId }));
    }

    const synced = yield* syncInvoiceFromQuote(quoteId, userId);
    yield* Effect.tryPromise(() =>
      db
        .update(quote)
        .set({ status: SENT_TO_CASHIER_STATUS, sentToCashierAt: new Date() })
        .where(eq(quote.id, quoteId)),
    );

    // A re-send closes a modification cycle, so the floor's line changes go on the record.
    if (found.invoice) {
      yield* Effect.tryPromise(() =>
        db.insert(invoiceAuditEvent).values({
          invoiceId: synced.invoice.id,
          type: "sent_to_cashier",
          actorId: userId,
          fromStatus: "finalized",
          toStatus: SENT_TO_CASHIER_STATUS,
          details: {
            previousTotal: synced.previousTotal,
            newTotal: synced.invoice.total,
            changes: synced.changes,
          },
        }),
      );
    }
    return synced.invoice;
  });
}

function paidOnInvoice(invoiceId: string) {
  return Effect.tryPromise(() =>
    db
      .select({ paid: sum(payment.amount) })
      .from(payment)
      .where(eq(payment.invoiceId, invoiceId)),
  ).pipe(Effect.map(([row]) => Number(row?.paid ?? 0)));
}

// Finalizing is where the floor commits to a total, so a quote whose invoice already holds
// payments cannot be finalized below them.
export function assertQuoteTotalCoversPaid(quoteId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.quote.findFirst({
        where: eq(quote.id, quoteId),
        columns: { total: true },
        with: { invoice: { columns: { id: true, total: true, tax: true } } },
      }),
    );
    if (!found?.invoice) return;

    const paid = yield* paidOnInvoice(found.invoice.id);
    const total = found.total + found.invoice.tax;
    if (total < paid && total !== found.invoice.total) {
      return yield* Effect.fail(new InvoiceTotalBelowPaid({ invoiceId: found.invoice.id, paid }));
    }
  });
}

// Stops a line from leaving the quote while a technician is already on its job, so the
// later re-send cannot get stuck on it.
export function assertQuoteItemRemovable(quoteItemId: string) {
  return Effect.gen(function* () {
    const linked = yield* Effect.tryPromise(() =>
      db.query.invoiceItem.findFirst({
        where: eq(invoiceItem.quoteItemId, quoteItemId),
        with: { job: { columns: { status: true } } },
      }),
    );
    if (linked?.job && linked.job.status !== "pending") {
      return yield* Effect.fail(
        new InvoiceLinesHaveStartedJobs({
          invoiceId: linked.invoiceId,
          lines: [lineSnapshot(linked).description],
        }),
      );
    }
  });
}

function lineSnapshot(item: {
  description: string | null;
  quantity: number;
  unitCost: number;
  itemType: string;
  inches: number | null;
  priceOverridden: boolean;
}): InvoiceLineSnapshot {
  return {
    description: item.description ?? "Rim Job",
    quantity: item.quantity,
    unitCost: item.unitCost,
    total: lineTotalCents(item),
  };
}

function sameLine(a: InvoiceLineSnapshot, b: InvoiceLineSnapshot) {
  return (
    a.description === b.description &&
    a.quantity === b.quantity &&
    a.unitCost === b.unitCost &&
    a.total === b.total
  );
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
    const paid = yield* paidOnInvoice(invoiceId);
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

      return { invoice: result, previousTotal: 0, changes: [] as InvoiceLineChange[] };
    }

    // Re-sending after a modification updates the invoice in place: lines keep their ids, so
    // jobs, payments and history stay attached and work already under way is left alone.
    const invoiceId = found.invoice.id;
    const existingItems = yield* Effect.tryPromise(() =>
      db.query.invoiceItem.findMany({
        where: eq(invoiceItem.invoiceId, invoiceId),
        with: { job: { columns: { id: true, status: true } } },
      }),
    );

    const billableIds = new Set(billableItems.map((i) => i.id));
    const existingByQuoteItem = new Map(
      existingItems.filter((i) => i.quoteItemId).map((i) => [i.quoteItemId!, i]),
    );
    const removed = existingItems.filter((i) => !i.quoteItemId || !billableIds.has(i.quoteItemId));
    const startedRemoved = removed.filter((i) => i.job && i.job.status !== "pending");

    if (startedRemoved.length > 0) {
      return yield* Effect.fail(
        new InvoiceLinesHaveStartedJobs({
          invoiceId,
          lines: startedRemoved.map((i) => lineSnapshot(i).description),
        }),
      );
    }

    const totals = yield* settleInvoiceTotals(invoiceId, found.invoice.total, {
      subtotal,
      discount: discountAmount,
      tax: found.invoice.tax,
    });

    const hasJobs = existingItems.some((i) => i.job);
    const changes: InvoiceLineChange[] = removed.map((i) => ({
      kind: "removed",
      before: lineSnapshot(i),
    }));

    const result = yield* Effect.tryPromise(() =>
      db.transaction(async (tx) => {
        const removedIds = removed.map((i) => i.id);
        if (removedIds.length > 0) {
          await tx.delete(job).where(inArray(job.invoiceItemId, removedIds));
          await tx.delete(invoiceItem).where(inArray(invoiceItem.id, removedIds));
        }

        const added: string[] = [];
        for (const item of billableItems) {
          const values = {
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
          };
          const current = existingByQuoteItem.get(item.id);
          if (current) {
            const before = lineSnapshot(current);
            const after = lineSnapshot(item);
            if (!sameLine(before, after)) changes.push({ kind: "changed", before, after });
            await tx.update(invoiceItem).set(values).where(eq(invoiceItem.id, current.id));
          } else {
            const [inserted] = await tx
              .insert(invoiceItem)
              .values({ invoiceId, quoteItemId: item.id, ...values })
              .returning({ id: invoiceItem.id });
            added.push(inserted!.id);
            changes.push({ kind: "added", after: lineSnapshot(item) });
          }
        }

        // Jobs are created for the whole invoice at once, so lines added after that would
        // otherwise never reach a technician.
        if (hasJobs && added.length > 0) {
          await tx.insert(job).values(added.map((invoiceItemId) => ({ invoiceId, invoiceItemId })));
        }

        const [inv] = await tx
          .update(invoice)
          .set(totals)
          .where(eq(invoice.id, invoiceId))
          .returning();

        return inv!;
      }),
    );

    return { invoice: result, previousTotal: found.invoice.total, changes };
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
