import { db } from "@rim-genie/db";
import { quote } from "@rim-genie/db/schema";
import { eq } from "drizzle-orm";

import { renderQuotePdf } from "./render-quote-pdf";

/**
 * Fetches the quote from the DB and renders it as a PDF buffer.
 * Returns null if the quote does not exist.
 */
export async function getQuotePdf(
  quoteId: string,
): Promise<{ buffer: Buffer; quoteNumber: number } | null> {
  const quoteRow = await db.query.quote.findFirst({
    where: eq(quote.id, quoteId),
    with: {
      customer: true,
      items: {
        orderBy: (i, { asc }) => [asc(i.sortOrder)],
      },
    },
  });

  if (!quoteRow) return null;

  const buffer = await renderQuotePdf({
    quoteNumber: quoteRow.quoteNumber,
    createdAt: quoteRow.createdAt,
    validUntil: quoteRow.validUntil,
    customer: quoteRow.customer,
    comments: quoteRow.comments,
    total: quoteRow.total,
    items: quoteRow.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  });

  return { buffer, quoteNumber: quoteRow.quoteNumber };
}
