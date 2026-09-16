import { and, eq, sum, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { quoteDiscountCents } from "@rim-genie/db/discount";
import { quote, quoteItem } from "@rim-genie/db/schema";

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
