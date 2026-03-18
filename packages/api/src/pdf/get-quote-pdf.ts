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
      excludedServices: true,
    },
  });

  if (!quoteRow) return null;

  const buffer = await renderQuotePdf({
    quoteNumber: quoteRow.quoteNumber,
    createdAt: quoteRow.createdAt,
    validUntil: quoteRow.validUntil,
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
    items: quoteRow.items.map((item) => ({
      id: item.id,
      description: item.description,
      comments: item.comments,
      quantity: item.quantity,
      unitCost: item.unitCost,
      inches: item.inches,
    })),
    excludedServices: quoteRow.excludedServices.map((es) => ({
      id: es.id,
      name: es.name,
      price: es.price,
    })),
  });

  return { buffer, quoteNumber: quoteRow.quoteNumber };
}
