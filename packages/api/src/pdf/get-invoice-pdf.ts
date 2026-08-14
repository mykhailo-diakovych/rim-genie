import { db } from "@rim-genie/db";
import { invoice } from "@rim-genie/db/schema";
import { eq } from "drizzle-orm";

import { renderInvoicePdf } from "./render-invoice-pdf";

export async function getInvoicePdf(
  invoiceId: string,
): Promise<{ buffer: Buffer; invoiceNumber: number } | null> {
  const invoiceRow = await db.query.invoice.findFirst({
    where: eq(invoice.id, invoiceId),
    with: {
      customer: true,
      items: {
        orderBy: (i, { asc }) => [asc(i.sortOrder)],
      },
      payments: {
        orderBy: (p, { desc }) => [desc(p.createdAt)],
        with: { receivedBy: true },
      },
      quote: {
        with: {
          items: {
            where: (i, { eq }) => eq(i.isExcluded, true),
            orderBy: (i, { asc }) => [asc(i.sortOrder)],
          },
        },
      },
    },
  });

  if (!invoiceRow) return null;

  const buffer = await renderInvoicePdf({
    invoiceNumber: invoiceRow.invoiceNumber,
    createdAt: invoiceRow.createdAt,
    customer: invoiceRow.customer,
    subtotal: invoiceRow.subtotal,
    discount: invoiceRow.discount,
    tax: invoiceRow.tax,
    total: invoiceRow.total,
    status: invoiceRow.status,
    notes: invoiceRow.notes,
    items: invoiceRow.items.map((item) => ({
      id: item.id,
      description: item.description,
      comments: item.comments,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
    excludedServices: (invoiceRow.quote?.items ?? []).map((item) => ({
      id: item.id,
      name: item.description ?? item.itemType,
      price: item.inches ? item.inches * item.unitCost : item.quantity * item.unitCost,
    })),
    payments: invoiceRow.payments.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      mode: p.mode,
      amount: p.amount,
      reference: p.reference,
      receivedByName: p.receivedBy?.name ?? null,
    })),
  });

  return { buffer, invoiceNumber: invoiceRow.invoiceNumber };
}
