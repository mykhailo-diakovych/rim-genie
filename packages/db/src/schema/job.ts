import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { customer } from "./floor";
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
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    dueDate: timestamp("due_date"),
    isOvernight: boolean("is_overnight").default(false).notNull(),
    isPickedUp: boolean("is_picked_up").default(false).notNull(),
    isMissing: boolean("is_missing").default(false).notNull(),
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

export const jobPickup = pgTable(
  "job_pickup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Nullable so that re-syncing or deleting a quote (which recreates its jobs) keeps the signed proof.
    jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    pickedUpById: text("picked_up_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    pickedUpAt: timestamp("picked_up_at").defaultNow().notNull(),
    notes: text("notes"),
    signatureDataUrl: text("signature_data_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("job_pickup_jobId_unique").on(table.jobId),
    index("job_pickup_customerId_idx").on(table.customerId),
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
  pickup: one(jobPickup),
}));

export const jobPickupRelations = relations(jobPickup, ({ one }) => ({
  job: one(job, {
    fields: [jobPickup.jobId],
    references: [job.id],
  }),
  customer: one(customer, {
    fields: [jobPickup.customerId],
    references: [customer.id],
  }),
  pickedUpBy: one(user, {
    fields: [jobPickup.pickedUpById],
    references: [user.id],
  }),
}));
