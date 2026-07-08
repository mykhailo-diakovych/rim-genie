import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { db } from "@rim-genie/db";
import {
  jobType,
  jobTypeExclusion,
  pricingConfig,
  vehicleSize,
  powderCoatColor,
  brakeServicePrice,
  powderCoatPrice,
  spotPolishPrice,
  serviceCategoryEnum,
  jobTypeSectionEnum,
  brakeUnitEnum,
  powderCoatScopeEnum,
  spotPolishSizeEnum,
} from "@rim-genie/db/schema";
import { and, asc, count, eq, gte, ilike, lte, ne } from "drizzle-orm";

import { adminProcedure, protectedProcedure } from "../index";

const jobTypeConfigSchema = z
  .object({
    hasSubType: z.boolean().optional(),
    subTypeLabel: z.string().optional(),
    hasQuantity: z.boolean().optional(),
    quantityLabel: z.string().optional(),
    hasRemovalOption: z.boolean().optional(),
    hasInchesInput: z.boolean().optional(),
    hasExpandedOptions: z.boolean().optional(),
    sizeMode: z.enum(["none", "individual", "range", "bucket"]).optional(),
    colorMode: z.enum(["none", "single", "multi"]).optional(),
  })
  .default({});

const jobTypeBodySchema = z.object({
  category: z.enum(serviceCategoryEnum.enumValues),
  section: z.enum(jobTypeSectionEnum.enumValues),
  parentId: z.string().min(1).nullable().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  config: jobTypeConfigSchema,
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const vehicleSizeBodySchema = z.object({
  name: z.string().min(1),
  key: z.string().min(1),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const colorBodySchema = z.object({
  name: z.string().min(1),
  key: z.string().min(1),
  hex: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const brakePriceBodySchema = z.object({
  vehicleSizeId: z.string().min(1),
  unit: z.enum(brakeUnitEnum.enumValues),
  removalIncluded: z.boolean(),
  unitCost: z.number().int().min(0),
});

const powderPriceBodySchema = z.object({
  minSize: z.number().int().min(1),
  maxSize: z.number().int().min(1),
  scope: z.enum(powderCoatScopeEnum.enumValues),
  colorCount: z.number().int().min(1),
  unitCost: z.number().int().min(0),
});

const spotPriceBodySchema = z.object({
  jobTypeKey: z.string().min(1),
  sizeBucket: z.enum(spotPolishSizeEnum.enumValues),
  unitCost: z.number().int().min(0),
});

export const catalogRouter = {
  // ─── Global pricing config: steel discount % + truck markup % (R2, R3) ────
  config: {
    get: protectedProcedure.handler(async () => {
      const [row] = await db
        .select()
        .from(pricingConfig)
        .where(eq(pricingConfig.id, "singleton"))
        .limit(1);
      return {
        steelDiscountPercent: row?.steelDiscountPercent ?? 20,
        truckMarkupPercent: row?.truckMarkupPercent ?? 20,
      };
    }),

    update: adminProcedure
      .input(
        z.object({
          steelDiscountPercent: z.number().int().min(0).max(100),
          truckMarkupPercent: z.number().int().min(0).max(1000),
        }),
      )
      .handler(async ({ input }) => {
        const [row] = await db
          .insert(pricingConfig)
          .values({ id: "singleton", ...input })
          .onConflictDoUpdate({ target: pricingConfig.id, set: input })
          .returning();
        return row!;
      }),
  },

  // ─── Dynamic job types (R1) ───────────────────────────────────────────────
  jobTypes: {
    list: adminProcedure
      .input(
        z.object({
          category: z.enum(serviceCategoryEnum.enumValues).optional(),
          section: z.enum(jobTypeSectionEnum.enumValues).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(50),
          search: z.string().default(""),
        }),
      )
      .handler(async ({ input }) => {
        const { category, section, page, pageSize, search } = input;
        const offset = (page - 1) * pageSize;

        const where = and(
          category ? eq(jobType.category, category) : undefined,
          section ? eq(jobType.section, section) : undefined,
          search ? ilike(jobType.label, `%${search}%`) : undefined,
        );

        const [items, [totalRow]] = await Promise.all([
          db
            .select()
            .from(jobType)
            .where(where)
            .orderBy(asc(jobType.section), asc(jobType.sortOrder), asc(jobType.label))
            .limit(pageSize)
            .offset(offset),
          db.select({ total: count() }).from(jobType).where(where),
        ]);

        return { items, total: totalRow?.total ?? 0 };
      }),

    // Active job types for a section, nested: group headers carry their children,
    // standalone (generic) items have an empty children array. Drives the quote generator.
    bySection: protectedProcedure
      .input(z.object({ section: z.enum(jobTypeSectionEnum.enumValues) }))
      .handler(async ({ input }) => {
        const rows = await db
          .select()
          .from(jobType)
          .where(and(eq(jobType.section, input.section), eq(jobType.isActive, true)))
          .orderBy(asc(jobType.sortOrder), asc(jobType.label));

        const childrenByParent = new Map<string, typeof rows>();
        for (const row of rows) {
          if (!row.parentId) continue;
          const list = childrenByParent.get(row.parentId);
          if (list) list.push(row);
          else childrenByParent.set(row.parentId, [row]);
        }

        return rows
          .filter((row) => !row.parentId)
          .map((row) => ({ ...row, children: childrenByParent.get(row.id) ?? [] }));
      }),

    create: adminProcedure.input(jobTypeBodySchema).handler(async ({ input }) => {
      const clash = await db
        .select({ id: jobType.id })
        .from(jobType)
        .where(eq(jobType.key, input.key))
        .limit(1);
      if (clash.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: `A job type with key "${input.key}" already exists`,
        });
      }
      const [row] = await db.insert(jobType).values(input).returning();
      return row!;
    }),

    update: adminProcedure
      .input(jobTypeBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const clash = await db
          .select({ id: jobType.id })
          .from(jobType)
          .where(and(eq(jobType.key, fields.key), ne(jobType.id, id)))
          .limit(1);
        if (clash.length > 0) {
          throw new ORPCError("CONFLICT", {
            message: `A job type with key "${fields.key}" already exists`,
          });
        }
        const [row] = await db
          .update(jobType)
          .set(fields)
          .where(eq(jobType.id, id))
          .returning();
        return row!;
      }),

    // Cascades to child sub-types and any exclusion rows via FK ON DELETE CASCADE.
    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(jobType).where(eq(jobType.id, input.id));
        return { success: true as const };
      }),
  },

  // ─── Mutual exclusivity (R11) ─────────────────────────────────────────────
  exclusions: {
    list: protectedProcedure.handler(async () => {
      return db
        .select()
        .from(jobTypeExclusion)
        .orderBy(asc(jobTypeExclusion.createdAt));
    }),

    create: adminProcedure
      .input(
        z.object({
          jobTypeAId: z.string().min(1),
          jobTypeBId: z.string().min(1),
        }),
      )
      .handler(async ({ input }) => {
        // Normalize order so the unique index rejects mirrored duplicates.
        const [jobTypeAId, jobTypeBId] = [input.jobTypeAId, input.jobTypeBId].sort();
        if (jobTypeAId === jobTypeBId) {
          throw new ORPCError("BAD_REQUEST", {
            message: "A job type cannot be mutually exclusive with itself",
          });
        }
        const existing = await db
          .select({ id: jobTypeExclusion.id })
          .from(jobTypeExclusion)
          .where(
            and(
              eq(jobTypeExclusion.jobTypeAId, jobTypeAId!),
              eq(jobTypeExclusion.jobTypeBId, jobTypeBId!),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          throw new ORPCError("CONFLICT", {
            message: "These job types are already mutually exclusive",
          });
        }
        const [row] = await db
          .insert(jobTypeExclusion)
          .values({ jobTypeAId: jobTypeAId!, jobTypeBId: jobTypeBId! })
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(jobTypeExclusion).where(eq(jobTypeExclusion.id, input.id));
        return { success: true as const };
      }),
  },

  // ─── Vehicle sizes (R4) ───────────────────────────────────────────────────
  vehicleSizes: {
    list: protectedProcedure
      .input(
        z.object({ includeInactive: z.boolean().default(false) }).default({ includeInactive: false }),
      )
      .handler(async ({ input }) => {
        return db
          .select()
          .from(vehicleSize)
          .where(input.includeInactive ? undefined : eq(vehicleSize.isActive, true))
          .orderBy(asc(vehicleSize.sortOrder), asc(vehicleSize.name));
      }),

    create: adminProcedure.input(vehicleSizeBodySchema).handler(async ({ input }) => {
      const [row] = await db.insert(vehicleSize).values(input).returning();
      return row!;
    }),

    update: adminProcedure
      .input(vehicleSizeBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(vehicleSize)
          .set(fields)
          .where(eq(vehicleSize.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(vehicleSize).where(eq(vehicleSize.id, input.id));
        return { success: true as const };
      }),
  },

  // ─── Powder-coat colors (R7) ──────────────────────────────────────────────
  colors: {
    list: protectedProcedure
      .input(
        z.object({ includeInactive: z.boolean().default(false) }).default({ includeInactive: false }),
      )
      .handler(async ({ input }) => {
        return db
          .select()
          .from(powderCoatColor)
          .where(input.includeInactive ? undefined : eq(powderCoatColor.isActive, true))
          .orderBy(asc(powderCoatColor.sortOrder), asc(powderCoatColor.name));
      }),

    create: adminProcedure.input(colorBodySchema).handler(async ({ input }) => {
      const [row] = await db.insert(powderCoatColor).values(input).returning();
      return row!;
    }),

    update: adminProcedure
      .input(colorBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(powderCoatColor)
          .set(fields)
          .where(eq(powderCoatColor.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(powderCoatColor).where(eq(powderCoatColor.id, input.id));
        return { success: true as const };
      }),
  },

  // ─── Brake / skimming prices — by vehicle size (R5) ───────────────────────
  brakePrices: {
    list: adminProcedure.handler(async () => {
      return db
        .select({
          id: brakeServicePrice.id,
          vehicleSizeId: brakeServicePrice.vehicleSizeId,
          vehicleSizeName: vehicleSize.name,
          unit: brakeServicePrice.unit,
          removalIncluded: brakeServicePrice.removalIncluded,
          unitCost: brakeServicePrice.unitCost,
        })
        .from(brakeServicePrice)
        .leftJoin(vehicleSize, eq(brakeServicePrice.vehicleSizeId, vehicleSize.id))
        .orderBy(
          asc(vehicleSize.sortOrder),
          asc(brakeServicePrice.unit),
          asc(brakeServicePrice.removalIncluded),
        );
    }),

    create: adminProcedure.input(brakePriceBodySchema).handler(async ({ input }) => {
      const existing = await db
        .select({ id: brakeServicePrice.id })
        .from(brakeServicePrice)
        .where(
          and(
            eq(brakeServicePrice.vehicleSizeId, input.vehicleSizeId),
            eq(brakeServicePrice.unit, input.unit),
            eq(brakeServicePrice.removalIncluded, input.removalIncluded),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: "A brake price for this vehicle size / unit / removal combination already exists",
        });
      }
      const [row] = await db.insert(brakeServicePrice).values(input).returning();
      return row!;
    }),

    update: adminProcedure
      .input(brakePriceBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(brakeServicePrice)
          .set(fields)
          .where(eq(brakeServicePrice.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(brakeServicePrice).where(eq(brakeServicePrice.id, input.id));
        return { success: true as const };
      }),

    lookup: protectedProcedure
      .input(
        z.object({
          vehicleSizeId: z.string().min(1),
          unit: z.enum(brakeUnitEnum.enumValues),
          removalIncluded: z.boolean(),
          quantity: z.number().int().min(1).default(1),
        }),
      )
      .handler(async ({ input }) => {
        const [row] = await db
          .select({ unitCost: brakeServicePrice.unitCost })
          .from(brakeServicePrice)
          .where(
            and(
              eq(brakeServicePrice.vehicleSizeId, input.vehicleSizeId),
              eq(brakeServicePrice.unit, input.unit),
              eq(brakeServicePrice.removalIncluded, input.removalIncluded),
            ),
          )
          .limit(1);
        const unitCost = row?.unitCost ?? 0;
        return { unitCost, total: unitCost * input.quantity, found: !!row };
      }),
  },

  // ─── Powder-coat prices — size range × scope × color count (R7) ──────────
  powderPrices: {
    list: adminProcedure.handler(async () => {
      return db
        .select()
        .from(powderCoatPrice)
        .orderBy(
          asc(powderCoatPrice.minSize),
          asc(powderCoatPrice.scope),
          asc(powderCoatPrice.colorCount),
        );
    }),

    create: adminProcedure.input(powderPriceBodySchema).handler(async ({ input }) => {
      if (input.maxSize < input.minSize) {
        throw new ORPCError("BAD_REQUEST", { message: "maxSize must be >= minSize" });
      }
      const existing = await db
        .select({ id: powderCoatPrice.id })
        .from(powderCoatPrice)
        .where(
          and(
            eq(powderCoatPrice.minSize, input.minSize),
            eq(powderCoatPrice.maxSize, input.maxSize),
            eq(powderCoatPrice.scope, input.scope),
            eq(powderCoatPrice.colorCount, input.colorCount),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: "A powder-coat price for this range / scope / color combination already exists",
        });
      }
      const [row] = await db.insert(powderCoatPrice).values(input).returning();
      return row!;
    }),

    update: adminProcedure
      .input(powderPriceBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        if (fields.maxSize < fields.minSize) {
          throw new ORPCError("BAD_REQUEST", { message: "maxSize must be >= minSize" });
        }
        const [row] = await db
          .update(powderCoatPrice)
          .set(fields)
          .where(eq(powderCoatPrice.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(powderCoatPrice).where(eq(powderCoatPrice.id, input.id));
        return { success: true as const };
      }),

    lookup: protectedProcedure
      .input(
        z.object({
          size: z.number().int().min(1),
          scope: z.enum(powderCoatScopeEnum.enumValues),
          colorCount: z.number().int().min(1),
        }),
      )
      .handler(async ({ input }) => {
        const [row] = await db
          .select({ unitCost: powderCoatPrice.unitCost })
          .from(powderCoatPrice)
          .where(
            and(
              lte(powderCoatPrice.minSize, input.size),
              gte(powderCoatPrice.maxSize, input.size),
              eq(powderCoatPrice.scope, input.scope),
              eq(powderCoatPrice.colorCount, input.colorCount),
            ),
          )
          .limit(1);
        return { unitCost: row?.unitCost ?? 0, found: !!row };
      }),
  },

  // ─── Spot-polish prices — job type × size bucket (R8) ────────────────────
  spotPrices: {
    list: adminProcedure.handler(async () => {
      return db
        .select()
        .from(spotPolishPrice)
        .orderBy(asc(spotPolishPrice.jobTypeKey), asc(spotPolishPrice.sizeBucket));
    }),

    create: adminProcedure.input(spotPriceBodySchema).handler(async ({ input }) => {
      const existing = await db
        .select({ id: spotPolishPrice.id })
        .from(spotPolishPrice)
        .where(
          and(
            eq(spotPolishPrice.jobTypeKey, input.jobTypeKey),
            eq(spotPolishPrice.sizeBucket, input.sizeBucket),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: "A spot-polish price for this type / size bucket already exists",
        });
      }
      const [row] = await db.insert(spotPolishPrice).values(input).returning();
      return row!;
    }),

    update: adminProcedure
      .input(spotPriceBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(spotPolishPrice)
          .set(fields)
          .where(eq(spotPolishPrice.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(spotPolishPrice).where(eq(spotPolishPrice.id, input.id));
        return { success: true as const };
      }),

    lookup: protectedProcedure
      .input(
        z.object({
          jobTypeKey: z.string().min(1),
          sizeBucket: z.enum(spotPolishSizeEnum.enumValues),
          quantity: z.number().int().min(1).default(1),
        }),
      )
      .handler(async ({ input }) => {
        const [row] = await db
          .select({ unitCost: spotPolishPrice.unitCost })
          .from(spotPolishPrice)
          .where(
            and(
              eq(spotPolishPrice.jobTypeKey, input.jobTypeKey),
              eq(spotPolishPrice.sizeBucket, input.sizeBucket),
            ),
          )
          .limit(1);
        const unitCost = row?.unitCost ?? 0;
        return { unitCost, total: unitCost * input.quantity, found: !!row };
      }),
  },
};
