import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { customer, quote } from "./floor";

export const discountRequestTypeEnum = pgEnum("discount_request_type", ["quote", "customer"]);
export const discountRequestStatusEnum = pgEnum("discount_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export type DiscountRequestType = (typeof discountRequestTypeEnum.enumValues)[number];
export type DiscountRequestStatus = (typeof discountRequestStatusEnum.enumValues)[number];

export const discountRequest = pgTable(
  "discount_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: discountRequestTypeEnum("type").notNull(),
    status: discountRequestStatusEnum("status").default("pending").notNull(),
    quoteId: text("quote_id").references(() => quote.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customer.id, { onDelete: "cascade" }),
    requestedById: text("requested_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedPercent: integer("requested_percent").notNull(),
    approvedPercent: integer("approved_percent"),
    resolvedById: text("resolved_by_id").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    reason: text("reason"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("discount_request_status_idx").on(table.status),
    index("discount_request_quoteId_idx").on(table.quoteId),
    index("discount_request_customerId_idx").on(table.customerId),
  ],
);

export const discountRequestRelations = relations(discountRequest, ({ one }) => ({
  quote: one(quote, {
    fields: [discountRequest.quoteId],
    references: [quote.id],
  }),
  customer: one(customer, {
    fields: [discountRequest.customerId],
    references: [customer.id],
  }),
  requestedBy: one(user, {
    fields: [discountRequest.requestedById],
    references: [user.id],
    relationName: "discountRequestedBy",
  }),
  resolvedBy: one(user, {
    fields: [discountRequest.resolvedById],
    references: [user.id],
    relationName: "discountResolvedBy",
  }),
}));
