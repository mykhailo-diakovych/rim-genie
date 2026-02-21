import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import type { JobTypeEntry } from "./floor";
import { customer, quote } from "./floor";
import { user } from "./auth";

export const invoiceStatusEnum = pgEnum("invoice_status", ["unpaid", "partially_paid", "paid"]);

export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];

export const paymentModeEnum = pgEnum("payment_mode", [
  "credit_card",
  "debit_card",
  "bank_transfer",
  "cash",
  "cheque",
]);

export type PaymentMode = (typeof paymentModeEnum.enumValues)[number];

export const invoice = pgTable(
  "invoice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceNumber: serial("invoice_number").notNull(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quote.id, { onDelete: "restrict" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    status: invoiceStatusEnum("status").default("unpaid").notNull(),
    subtotal: integer("subtotal").default(0).notNull(),
    discount: integer("discount").default(0).notNull(),
    tax: integer("tax").default(0).notNull(),
    total: integer("total").default(0).notNull(),
    notes: text("notes"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("invoice_quoteId_unique").on(table.quoteId),
    index("invoice_customerId_idx").on(table.customerId),
    index("invoice_createdById_idx").on(table.createdById),
    index("invoice_status_idx").on(table.status),
  ],
);

export const invoiceItem = pgTable(
  "invoice_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    vehicleSize: text("vehicle_size"),
    sideOfVehicle: text("side_of_vehicle"),
    damageLevel: text("damage_level"),
    quantity: integer("quantity").default(1).notNull(),
    unitCost: integer("unit_cost").default(0).notNull(),
    jobTypes: jsonb("job_types").$type<JobTypeEntry[]>().default([]).notNull(),
    description: text("description"),
    comments: text("comments"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("invoiceItem_invoiceId_idx").on(table.invoiceId)],
);

export const payment = pgTable(
  "payment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    mode: paymentModeEnum("mode").notNull(),
    reference: text("reference"),
    receivedById: text("received_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payment_invoiceId_idx").on(table.invoiceId),
    index("payment_receivedById_idx").on(table.receivedById),
  ],
);

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  quote: one(quote, {
    fields: [invoice.quoteId],
    references: [quote.id],
  }),
  customer: one(customer, {
    fields: [invoice.customerId],
    references: [customer.id],
  }),
  createdBy: one(user, {
    fields: [invoice.createdById],
    references: [user.id],
  }),
  items: many(invoiceItem),
  payments: many(payment),
}));

export const invoiceItemRelations = relations(invoiceItem, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceItem.invoiceId],
    references: [invoice.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id],
  }),
  receivedBy: one(user, {
    fields: [payment.receivedById],
    references: [user.id],
  }),
}));
