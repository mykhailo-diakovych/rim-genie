import { relations, sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { invoice } from "./invoice";

export const invoiceModificationStatusEnum = pgEnum("invoice_modification_status", [
  "pending",
  "approved",
  "rejected",
]);

export type InvoiceModificationStatus = (typeof invoiceModificationStatusEnum.enumValues)[number];

export const invoiceAuditEventTypeEnum = pgEnum("invoice_audit_event_type", [
  "modification_requested",
  "modification_approved",
  "modification_rejected",
  "refinalized",
  "sent_to_cashier",
]);

export type InvoiceAuditEventType = (typeof invoiceAuditEventTypeEnum.enumValues)[number];

export type InvoiceLineSnapshot = {
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
};

export type InvoiceLineChange =
  | { kind: "added"; after: InvoiceLineSnapshot }
  | { kind: "removed"; before: InvoiceLineSnapshot }
  | { kind: "changed"; before: InvoiceLineSnapshot; after: InvoiceLineSnapshot };

export type InvoiceAuditDetails = {
  reason?: string | null;
  previousTotal?: number;
  newTotal?: number;
  changes?: InvoiceLineChange[];
};

export const invoiceModificationRequest = pgTable(
  "invoice_modification_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    requestedById: text("requested_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    assignedAdminId: text("assigned_admin_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reason: text("reason"),
    status: invoiceModificationStatusEnum("status").default("pending").notNull(),
    resolvedById: text("resolved_by_id").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoice_modification_request_invoiceId_idx").on(table.invoiceId),
    uniqueIndex("invoice_modification_request_one_pending")
      .on(table.invoiceId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

// Status values are quote workflow statuses (see quote-status.ts).
export const invoiceAuditEvent = pgTable(
  "invoice_audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    modificationRequestId: text("modification_request_id").references(
      () => invoiceModificationRequest.id,
      { onDelete: "set null" },
    ),
    type: invoiceAuditEventTypeEnum("type").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    details: jsonb("details").$type<InvoiceAuditDetails>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("invoice_audit_event_invoiceId_idx").on(table.invoiceId, table.createdAt)],
);

export const invoiceModificationRequestRelations = relations(
  invoiceModificationRequest,
  ({ one }) => ({
    invoice: one(invoice, {
      fields: [invoiceModificationRequest.invoiceId],
      references: [invoice.id],
    }),
    requestedBy: one(user, {
      fields: [invoiceModificationRequest.requestedById],
      references: [user.id],
      relationName: "invoiceModificationRequestedBy",
    }),
    assignedAdmin: one(user, {
      fields: [invoiceModificationRequest.assignedAdminId],
      references: [user.id],
      relationName: "invoiceModificationAssignedAdmin",
    }),
    resolvedBy: one(user, {
      fields: [invoiceModificationRequest.resolvedById],
      references: [user.id],
      relationName: "invoiceModificationResolvedBy",
    }),
  }),
);

export const invoiceAuditEventRelations = relations(invoiceAuditEvent, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceAuditEvent.invoiceId],
    references: [invoice.id],
  }),
  actor: one(user, {
    fields: [invoiceAuditEvent.actorId],
    references: [user.id],
  }),
  modificationRequest: one(invoiceModificationRequest, {
    fields: [invoiceAuditEvent.modificationRequestId],
    references: [invoiceModificationRequest.id],
  }),
}));
