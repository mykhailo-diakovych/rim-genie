import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const inventoryRecordTypeEnum = pgEnum("inventory_record_type", ["eod", "sod"]);

export type InventoryRecordType = (typeof inventoryRecordTypeEnum.enumValues)[number];

export const inventoryRecord = pgTable(
  "inventory_record",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: inventoryRecordTypeEnum("type").notNull(),
    recordDate: text("record_date").notNull(),
    unfinishedJobCount: integer("unfinished_job_count").notNull(),
    rimCount: integer("rim_count").notNull(),
    previousEodId: text("previous_eod_id"),
    hasDiscrepancy: boolean("has_discrepancy").default(false).notNull(),
    discrepancyNotes: text("discrepancy_notes"),
    notes: text("notes"),
    recordedById: text("recorded_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("inventory_record_type_date_unique").on(table.type, table.recordDate),
    index("inventory_record_type_idx").on(table.type),
    index("inventory_record_recordDate_idx").on(table.recordDate),
    index("inventory_record_recordedById_idx").on(table.recordedById),
  ],
);

export const inventoryRecordRelations = relations(inventoryRecord, ({ one }) => ({
  recordedBy: one(user, {
    fields: [inventoryRecord.recordedById],
    references: [user.id],
  }),
  previousEod: one(inventoryRecord, {
    fields: [inventoryRecord.previousEodId],
    references: [inventoryRecord.id],
  }),
}));
