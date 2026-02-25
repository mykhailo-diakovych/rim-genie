import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const notificationTypeEnum = pgEnum("notification_type", [
  "inventory_discrepancy",
  "discount_request",
  "discount_approved",
  "discount_rejected",
  "job_completed",
]);

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export const notification = pgTable(
  "notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").default(false).notNull(),
    referenceId: text("reference_id"),
    referenceType: text("reference_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_recipientId_idx").on(table.recipientId),
    index("notification_isRead_idx").on(table.recipientId, table.isRead),
    index("notification_createdAt_idx").on(table.createdAt),
  ],
);

export const notificationRelations = relations(notification, ({ one }) => ({
  recipient: one(user, {
    fields: [notification.recipientId],
    references: [user.id],
  }),
}));
