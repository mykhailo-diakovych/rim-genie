
const INVOICE_ORIGINS = ["cashier", "customer"] as const;

export type InvoiceOrigin = (typeof INVOICE_ORIGINS)[number];

export function validateInvoiceOrigin(search: Record<string, unknown>): { from?: InvoiceOrigin } {
  return {
    from: INVOICE_ORIGINS.includes(search.from as InvoiceOrigin)
      ? (search.from as InvoiceOrigin)
      : undefined,
  };
}
