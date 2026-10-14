import type { ApiJob } from "./types";

type ApiInvoice = ApiJob["invoice"];

export function formatInvoiceNumber(invoiceNumber: number) {
  return `INV-${String(invoiceNumber).padStart(4, "0")}`;
}

export function invoiceJobsInOrder(invoice: ApiInvoice) {
  return [...invoice.jobs].sort(
    (a, b) => a.invoiceItem.sortOrder - b.invoiceItem.sortOrder || a.id.localeCompare(b.id),
  );
}

export function formatJobPosition(job: ApiJob) {
  const jobs = invoiceJobsInOrder(job.invoice);
  return `Job ${jobs.findIndex((j) => j.id === job.id) + 1} of ${jobs.length}`;
}

export function getInvoiceBalance(invoice: ApiInvoice) {
  return invoice.total - invoice.payments.reduce((sum, p) => sum + p.amount, 0);
}

// Mirrors the server rule: one signature releases the whole invoice, so every job still in
// the shop has to be completed first.
export function getInvoicePickupState(invoice: ApiInvoice) {
  const remaining = invoice.jobs.filter((j) => !j.isPickedUp);
  const completed = remaining.filter((j) => j.status === "completed").length;
  return {
    ready: remaining.length > 0 && completed === remaining.length,
    completed,
    total: remaining.length,
  };
}
