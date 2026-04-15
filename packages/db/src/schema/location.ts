import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const location = pgTable(
  "location",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    address: text("address").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("location_name_idx").on(table.name)],
);

export const locationRelations = relations(location, ({ many }) => ({
  users: many(user),
  userLocations: many(userLocation),
}));

export const userLocation = pgTable(
  "user_location",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.locationId] }),
    index("user_location_user_id_idx").on(table.userId),
    index("user_location_location_id_idx").on(table.locationId),
  ],
);

export const userLocationRelations = relations(userLocation, ({ one }) => ({
  user: one(user, {
    fields: [userLocation.userId],
    references: [user.id],
  }),
  location: one(location, {
    fields: [userLocation.locationId],
    references: [location.id],
  }),
}));
