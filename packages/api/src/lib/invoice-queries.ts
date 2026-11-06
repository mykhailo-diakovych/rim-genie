import { sql } from "drizzle-orm";

import { invoice, payment } from "@rim-genie/db/schema";

export const lastPaymentAt = sql<Date | null>`(select max(${payment.createdAt}) from ${payment} where ${payment.invoiceId} = ${invoice.id})`;
