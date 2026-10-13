import { Effect } from "effect";
import { and, eq, sum, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { quoteDiscountCents } from "@rim-genie/db/discount";
import { isQuoteEditable } from "@rim-genie/db/quote-status";
import { quote, quoteItem } from "@rim-genie/db/schema";

import { QuoteNotEditable, QuoteNotFound } from "./errors";
import { runEffect } from "./run-effect";

// Server-side half of the read-only rule: no role can change a quote once it is with the cashier.
export async function assertQuoteEditable(quoteId: string): Promise<void> {
  const [row] = await db.select({ status: quote.status }).from(quote).where(eq(quote.id, quoteId));
  if (!row) await runEffect(Effect.fail(new QuoteNotFound({ id: quoteId })));
  else if (!isQuoteEditable(row.status)) {
    await runEffect(Effect.fail(new QuoteNotEditable({ quoteId })));
  }
}

export async function recalcQuoteTotal(quoteId: string): Promise<void> {
  const result = await db
    .select({
      total: sum(
        // SQL mirror of lineTotalCents().
        sql`CASE WHEN ${quoteItem.priceOverridden} = false AND ${quoteItem.itemType} = 'welding' AND ${quoteItem.inches} IS NOT NULL THEN ${quoteItem.inches} * ${quoteItem.unitCost} * ${quoteItem.quantity} ELSE ${quoteItem.quantity} * ${quoteItem.unitCost} END`,
      ),
    })
    .from(quoteItem)
    .where(and(eq(quoteItem.quoteId, quoteId), eq(quoteItem.isExcluded, false)));

  const subtotal = Number(result[0]?.total ?? 0);

  const quoteRow = await db
    .select({
      discountType: quote.discountType,
      discountPercent: quote.discountPercent,
      discountFixedCents: quote.discountFixedCents,
    })
    .from(quote)
    .where(eq(quote.id, quoteId));

  const discountAmount = quoteDiscountCents(subtotal, {
    discountType: quoteRow[0]?.discountType ?? "percent",
    discountPercent: quoteRow[0]?.discountPercent ?? 0,
    discountFixedCents: quoteRow[0]?.discountFixedCents ?? 0,
  });
  const total = subtotal - discountAmount;

  await db.update(quote).set({ subtotal, discountAmount, total }).where(eq(quote.id, quoteId));
}
