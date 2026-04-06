import { pgEnum, pgTable, text, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", ["rim", "general"]);
export const vehicleTypeEnum = pgEnum("vehicle_type", ["car", "suv", "truck", "van"]);

export type ServiceType = (typeof serviceTypeEnum.enumValues)[number];

export const serviceCategoryEnum = pgEnum("service_category", [
  "rim",
  "welding",
  "powder_coating",
  "general",
]);
export const rimMaterialEnum = pgEnum("rim_material", ["steel", "aluminum"]);
export const quoteVehicleTypeEnum = pgEnum("quote_vehicle_type", [
  "truck",
  "car_suv",
  "motorcycle",
]);

export type ServiceCategory = (typeof serviceCategoryEnum.enumValues)[number];
export type RimMaterial = (typeof rimMaterialEnum.enumValues)[number];
export type QuoteVehicleType = (typeof quoteVehicleTypeEnum.enumValues)[number];

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

export const servicePrice = pgTable(
  "service_price",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    category: serviceCategoryEnum("category").notNull(),
    jobType: text("job_type").notNull(),
    vehicleType: quoteVehicleTypeEnum("vehicle_type"),
    rimMaterial: rimMaterialEnum("rim_material"),
    minSize: integer("min_size"),
    maxSize: integer("max_size"),
    unitCost: integer("unit_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("service_price_category_idx").on(table.category),
    index("service_price_lookup_idx").on(
      table.category,
      table.jobType,
      table.vehicleType,
      table.rimMaterial,
    ),
  ],
);
