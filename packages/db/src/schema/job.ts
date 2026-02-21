import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { invoice, invoiceItem } from "./invoice";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "accepted",
  "in_progress",
  "completed",
]);

export type JobStatus = (typeof jobStatusEnum.enumValues)[number];

export const job = pgTable(
  "job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "restrict" }),
    invoiceItemId: text("invoice_item_id")
      .notNull()
      .references(() => invoiceItem.id, { onDelete: "restrict" }),
    technicianId: text("technician_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    status: jobStatusEnum("status").default("pending").notNull(),
    acceptedAt: timestamp("accepted_at"),
    completedAt: timestamp("completed_at"),
    dueDate: timestamp("due_date"),
    isOvernight: boolean("is_overnight").default(false).notNull(),
    specialNotes: text("special_notes"),
    proofVideoUrl: text("proof_video_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("job_invoiceItemId_unique").on(table.invoiceItemId),
    index("job_invoiceId_idx").on(table.invoiceId),
    index("job_technicianId_idx").on(table.technicianId),
    index("job_status_idx").on(table.status),
  ],
);

export const jobRelations = relations(job, ({ one }) => ({
  invoice: one(invoice, {
    fields: [job.invoiceId],
    references: [invoice.id],
  }),
  invoiceItem: one(invoiceItem, {
    fields: [job.invoiceItemId],
    references: [invoiceItem.id],
  }),
  technician: one(user, {
    fields: [job.technicianId],
    references: [user.id],
  }),
}));
