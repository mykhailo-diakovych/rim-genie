import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { serviceCategoryEnum } from "./manage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobTypeConfig = {
  hasSubType?: boolean;
  subTypeLabel?: string;
  hasQuantity?: boolean;
  quantityLabel?: string;
  hasRemovalOption?: boolean;
  hasInchesInput?: boolean;
  hasExpandedOptions?: boolean;
  sizeMode?: "none" | "individual" | "range" | "bucket";
  colorMode?: "none" | "single" | "multi";
};

// ─── Enums ──────────────────────────────────────────────────────────────────

export const jobTypeSectionEnum = pgEnum("job_type_section", [
  "rims",
  "tire-service",
  "brake-service",
  "other-welding",
  "powder-coating",
  "spot-polish",
]);
export const brakeUnitEnum = pgEnum("brake_unit", ["single", "pair"]);
export const powderCoatScopeEnum = pgEnum("powder_coat_scope", ["set", "rim"]);
export const spotPolishSizeEnum = pgEnum("spot_polish_size", ["le20", "ge21"]);

export type JobTypeSection = (typeof jobTypeSectionEnum.enumValues)[number];
export type BrakeUnit = (typeof brakeUnitEnum.enumValues)[number];
export type PowderCoatScope = (typeof powderCoatScopeEnum.enumValues)[number];
export type SpotPolishSize = (typeof spotPolishSizeEnum.enumValues)[number];

// ─── Dynamic job types (R1) ─────────────────────────────────────────────────
// A group header (e.g. "Crack Fix") has parentId = null and config.hasSubType = true;
// its selectable sub-types reference it via parentId. A standalone "generic" job
// (e.g. "Bend") has parentId = null and no children. `key` is the price key that
// servicePrice.jobType / spotPolishPrice.jobTypeKey reference.
export const jobType = pgTable(
  "job_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    category: serviceCategoryEnum("category").notNull(),
    section: jobTypeSectionEnum("section").notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => jobType.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    config: jsonb("config").$type<JobTypeConfig>().default({}).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("job_type_key_unique").on(table.key),
    index("job_type_category_idx").on(table.category),
    index("job_type_section_idx").on(table.section),
    index("job_type_parent_idx").on(table.parentId),
  ],
);

// ─── Mutual exclusivity (R11) ───────────────────────────────────────────────
// Store one row per unavoidable pair. Convention: jobTypeAId < jobTypeBId
// (enforced in the API) so the unique index prevents duplicate mirrored pairs.
export const jobTypeExclusion = pgTable(
  "job_type_exclusion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobTypeAId: text("job_type_a_id")
      .notNull()
      .references(() => jobType.id, { onDelete: "cascade" }),
    jobTypeBId: text("job_type_b_id")
      .notNull()
      .references(() => jobType.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("job_type_exclusion_pair_unique").on(
      table.jobTypeAId,
      table.jobTypeBId,
    ),
    index("job_type_exclusion_a_idx").on(table.jobTypeAId),
    index("job_type_exclusion_b_idx").on(table.jobTypeBId),
  ],
);

// ─── Global pricing config: steel discount % + truck markup % (R2, R3) ──────
export const pricingConfig = pgTable("pricing_config", {
  id: text("id").primaryKey().default("singleton"),
  steelDiscountPercent: integer("steel_discount_percent").notNull().default(20),
  truckMarkupPercent: integer("truck_markup_percent").notNull().default(20),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ─── Vehicle sizes — used by brake/skimming pricing (R4) ────────────────────
export const vehicleSize = pgTable(
  "vehicle_size",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    key: text("key").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [unique("vehicle_size_key_unique").on(table.key)],
);

// ─── Powder-coat colors (R7) ────────────────────────────────────────────────
export const powderCoatColor = pgTable(
  "powder_coat_color",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    key: text("key").notNull(),
    hex: text("hex"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [unique("powder_coat_color_key_unique").on(table.key)],
);

// ─── Brake / skimming prices — by vehicle size (R5, sheet 3.3) ──────────────
// Disc Rotor Skimming and Brake Drum Skimming share this rate table.
export const brakeServicePrice = pgTable(
  "brake_service_price",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    vehicleSizeId: text("vehicle_size_id")
      .notNull()
      .references(() => vehicleSize.id, { onDelete: "cascade" }),
    unit: brakeUnitEnum("unit").notNull(),
    removalIncluded: boolean("removal_included").default(false).notNull(),
    unitCost: integer("unit_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("brake_service_price_combo_unique").on(
      table.vehicleSizeId,
      table.unit,
      table.removalIncluded,
    ),
    index("brake_service_price_vehicle_idx").on(table.vehicleSizeId),
  ],
);

// ─── Powder-coat prices — size range × scope × color count (R7, sheet 3.5) ──
export const powderCoatPrice = pgTable(
  "powder_coat_price",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    minSize: integer("min_size").notNull(),
    maxSize: integer("max_size").notNull(),
    scope: powderCoatScopeEnum("scope").notNull(),
    colorCount: integer("color_count").notNull(),
    unitCost: integer("unit_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("powder_coat_price_combo_unique").on(
      table.minSize,
      table.maxSize,
      table.scope,
      table.colorCount,
    ),
    index("powder_coat_price_size_idx").on(table.minSize, table.maxSize),
  ],
);

// ─── Spot-polish prices — job type × size bucket (R8, sheet 3.6) ────────────
// jobTypeKey matches jobType.key for the spot-polish leaves (spot, edge, lip-2-3, …).
export const spotPolishPrice = pgTable(
  "spot_polish_price",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobTypeKey: text("job_type_key").notNull(),
    sizeBucket: spotPolishSizeEnum("size_bucket").notNull(),
    unitCost: integer("unit_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("spot_polish_price_combo_unique").on(
      table.jobTypeKey,
      table.sizeBucket,
    ),
    index("spot_polish_price_jobtype_idx").on(table.jobTypeKey),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const jobTypeRelations = relations(jobType, ({ one, many }) => ({
  parent: one(jobType, {
    fields: [jobType.parentId],
    references: [jobType.id],
    relationName: "job_type_parent",
  }),
  children: many(jobType, { relationName: "job_type_parent" }),
}));

export const vehicleSizeRelations = relations(vehicleSize, ({ many }) => ({
  brakePrices: many(brakeServicePrice),
}));

export const brakeServicePriceRelations = relations(
  brakeServicePrice,
  ({ one }) => ({
    vehicleSize: one(vehicleSize, {
      fields: [brakeServicePrice.vehicleSizeId],
      references: [vehicleSize.id],
    }),
  }),
);
