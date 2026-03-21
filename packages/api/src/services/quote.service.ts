import { eq, sum, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { quote, quoteItem } from "@rim-genie/db/schema";

export async function recalcQuoteTotal(quoteId: string): Promise<void> {
  const result = await db
    .select({
      total: sum(
        sql`CASE WHEN ${quoteItem.inches} IS NOT NULL THEN ${quoteItem.inches} * ${quoteItem.unitCost} ELSE ${quoteItem.quantity} * ${quoteItem.unitCost} END`,
      ),
    })
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, quoteId));

  const subtotal = Number(result[0]?.total ?? 0);

  const quoteRow = await db
    .select({ discountPercent: quote.discountPercent })
    .from(quote)
    .where(eq(quote.id, quoteId));

  const discountPercent = quoteRow[0]?.discountPercent ?? 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discountAmount;

  await db.update(quote).set({ subtotal, discountAmount, total }).where(eq(quote.id, quoteId));
}
