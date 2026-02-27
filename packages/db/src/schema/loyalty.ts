import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const loyaltyConfig = pgTable("loyalty_config", {
  id: text("id").primaryKey().default("singleton"),
  purchaseThreshold: integer("purchase_threshold").notNull().default(5),
  spendThreshold: integer("spend_threshold").notNull().default(50000),
  rewardPercent: integer("reward_percent").notNull().default(5),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
