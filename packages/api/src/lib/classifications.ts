import { and, eq, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { SENT_TO_CASHIER_STATUS } from "@rim-genie/db/quote-status";
import { invoice, job, quote } from "@rim-genie/db/schema";

export const sentToCashierInvoice = () =>
  inArray(
    invoice.quoteId,
    db.select({ id: quote.id }).from(quote).where(eq(quote.status, SENT_TO_CASHIER_STATUS)),
  );

// Invoices predating the location column stay visible at every branch.
export const invoiceAtLocation = (locationId: string | null | undefined) =>
  locationId ? or(eq(invoice.locationId, locationId), isNull(invoice.locationId)) : undefined;

// Pickup is per invoice, so a job is only ready once every job on its invoice is done or gone.
const readyInvoiceIds = () =>
  db
    .select({ id: job.invoiceId })
    .from(job)
    .groupBy(job.invoiceId)
    .having(sql`bool_and(${job.status} = 'completed' or ${job.isPickedUp})`);

export const readyForPickupJob = () =>
  and(
    eq(job.status, "completed"),
    eq(job.isPickedUp, false),
    inArray(job.invoiceId, readyInvoiceIds()),
  );

export const missingJob = () => and(eq(job.isMissing, true), eq(job.isPickedUp, false));

export const unassignedJob = () => and(isNull(job.technicianId), ne(job.status, "completed"));

export const overdueJob = () =>
  and(isNotNull(job.technicianId), ne(job.status, "completed"), lt(job.dueDate, new Date()));
