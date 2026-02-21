import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { invoice } from "./invoice";

// ─── Enum ─────────────────────────────────────────────────────────────────────

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "pending",
  "in_progress",
  "completed",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobTypeEntry = {
  type: "bend-fix" | "crack-fix" | "straighten" | "twist" | "reconstruct" | "general";
  input?: string;
};

// ─── Tables ───────────────────────────────────────────────────────────────────

export const customer = pgTable(
  "customer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    phone: text("phone").notNull().unique(),
    email: text("email"),
    birthdayDay: integer("birthday_day"),
    birthdayMonth: integer("birthday_month"),
    isVip: boolean("is_vip").default(false).notNull(),
    discount: integer("discount"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("customer_phone_idx").on(table.phone)],
);

export const quote = pgTable(
  "quote",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quoteNumber: serial("quote_number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: quoteStatusEnum("status").default("draft").notNull(),
    jobRack: text("job_rack"),
    comments: text("comments"),
    validUntil: timestamp("valid_until"),
    total: integer("total").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quote_customerId_idx").on(table.customerId),
    index("quote_createdById_idx").on(table.createdById),
    index("quote_status_idx").on(table.status),
  ],
);

export const quoteItem = pgTable("quote_item", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quote.id, { onDelete: "cascade" }),
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
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const customerRelations = relations(customer, ({ many }) => ({
  quotes: many(quote),
  invoices: many(invoice),
}));

export const quoteRelations = relations(quote, ({ one, many }) => ({
  customer: one(customer, {
    fields: [quote.customerId],
    references: [customer.id],
  }),
  createdBy: one(user, {
    fields: [quote.createdById],
    references: [user.id],
  }),
  items: many(quoteItem),
  invoice: one(invoice, {
    fields: [quote.id],
    references: [invoice.quoteId],
  }),
}));

export const quoteItemRelations = relations(quoteItem, ({ one }) => ({
  quote: one(quote, {
    fields: [quoteItem.quoteId],
    references: [quote.id],
  }),
}));
