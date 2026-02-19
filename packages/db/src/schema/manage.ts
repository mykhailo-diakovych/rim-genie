import { pgEnum, pgTable, text, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", ["rim", "general"]);
export const vehicleTypeEnum = pgEnum("vehicle_type", ["car", "suv", "truck", "van"]);

export type ServiceType = (typeof serviceTypeEnum.enumValues)[number];

export const service = pgTable(
  "service",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    type: serviceTypeEnum("type").notNull(),
    minSize: numeric("min_size", { precision: 5, scale: 2 }).notNull(),
    maxSize: numeric("max_size", { precision: 5, scale: 2 }).notNull(),
    vehicleType: vehicleTypeEnum("vehicle_type"),
    unitCost: integer("unit_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("service_type_idx").on(table.type)],
);
