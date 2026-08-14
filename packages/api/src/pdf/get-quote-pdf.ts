import { db } from "@rim-genie/db";
import { quote } from "@rim-genie/db/schema";
import { eq } from "drizzle-orm";

import { renderQuotePdf } from "./render-quote-pdf";

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

  const includedItems = quoteRow.items.filter((i) => !i.isExcluded);
  const excludedItems = quoteRow.items.filter((i) => i.isExcluded);

  const buffer = await renderQuotePdf({
    quoteNumber: quoteRow.quoteNumber,
    createdAt: quoteRow.createdAt,
    customerReason: quoteRow.customerReason,
    fullDiagnosticConsent: quoteRow.fullDiagnosticConsent,
    customer: quoteRow.customer
      ? {
          name: quoteRow.customer.name,
          phone: quoteRow.customer.phone,
          email: quoteRow.customer.email,
        }
      : null,
    comments: quoteRow.comments,
    subtotal: quoteRow.subtotal,
    discountPercent: quoteRow.discountPercent,
    discountAmount: quoteRow.discountAmount,
    total: quoteRow.total,
    items: includedItems.map((item) => ({
      id: item.id,
      description: item.description,
      comments: item.comments,
      quantity: item.quantity,
      unitCost: item.unitCost,
      inches: item.inches,
    })),
    excludedServices: excludedItems.map((item) => ({
      id: item.id,
      name: item.description ?? item.itemType,
      price: item.inches ? item.inches * item.unitCost : item.quantity * item.unitCost,
    })),
  });

  return { buffer, quoteNumber: quoteRow.quoteNumber };
}
