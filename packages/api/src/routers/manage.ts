import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { db } from "@rim-genie/db";
import {
  location,
  servicePrice,
  serviceCategoryEnum,
  quoteVehicleTypeEnum,
  rimMaterialEnum,
  user,
} from "@rim-genie/db/schema";
import { and, asc, count, eq, ilike, sql, gte, lte, or, isNull } from "drizzle-orm";

import { adminProcedure } from "../index";

export const manageRouter = {
  locations: {
    list: adminProcedure.handler(async () => {
      return db
        .select({
          id: location.id,
          name: location.name,
          address: location.address,
          createdAt: location.createdAt,
          userCount: sql<number>`count(${user.id})::int`,
        })
        .from(location)
        .leftJoin(user, eq(user.locationId, location.id))
        .groupBy(location.id)
        .orderBy(asc(location.name));
    }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1), address: z.string().min(1) }))
      .handler(async ({ input }) => {
        const [row] = await db.insert(location).values(input).returning();
        return row!;
      }),

    update: adminProcedure
      .input(z.object({ id: z.string(), name: z.string().min(1), address: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db.update(location).set(fields).where(eq(location.id, id)).returning();
        return row!;
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const [assigned] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(eq(user.locationId, input.id));

      if (assigned && assigned.count > 0) {
        throw new ORPCError("CONFLICT", {
          message: "Cannot delete a location that has assigned employees",
        });
      }

      await db.delete(location).where(eq(location.id, input.id));
      return { success: true as const };
    }),
  },

  pricing: {
    list: adminProcedure
      .input(
        z.object({
          category: z.enum(serviceCategoryEnum.enumValues).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(50),
          search: z.string().default(""),
        }),
      )
      .handler(async ({ input }) => {
        const { category, page, pageSize, search } = input;
        const offset = (page - 1) * pageSize;

        const where = and(
          category ? eq(servicePrice.category, category) : undefined,
          search ? ilike(servicePrice.jobType, `%${search}%`) : undefined,
        );

        const [items, [totalRow]] = await Promise.all([
          db
            .select()
            .from(servicePrice)
            .where(where)
            .orderBy(asc(servicePrice.category), asc(servicePrice.jobType))
            .limit(pageSize)
            .offset(offset),
          db.select({ total: count() }).from(servicePrice).where(where),
        ]);

        return { items, total: totalRow?.total ?? 0 };
      }),

    create: adminProcedure
      .input(
        z.object({
          category: z.enum(serviceCategoryEnum.enumValues),
          jobType: z.string().min(1),
          vehicleType: z.enum(quoteVehicleTypeEnum.enumValues).nullable().optional(),
          rimMaterial: z.enum(rimMaterialEnum.enumValues).nullable().optional(),
          minSize: z.number().int().min(1).nullable().optional(),
          maxSize: z.number().int().min(1).nullable().optional(),
          unitCost: z.number().int().min(0),
        }),
      )
      .handler(async ({ input }) => {
        const overlap = await db
          .select({ id: servicePrice.id })
          .from(servicePrice)
          .where(
            and(
              eq(servicePrice.category, input.category),
              eq(servicePrice.jobType, input.jobType),
              input.vehicleType
                ? eq(servicePrice.vehicleType, input.vehicleType)
                : isNull(servicePrice.vehicleType),
              input.rimMaterial
                ? eq(servicePrice.rimMaterial, input.rimMaterial)
                : isNull(servicePrice.rimMaterial),
              input.minSize != null && input.maxSize != null
                ? and(
                    or(isNull(servicePrice.maxSize), gte(servicePrice.maxSize, input.minSize)),
                    or(isNull(servicePrice.minSize), lte(servicePrice.minSize, input.maxSize)),
                  )
                : undefined,
            ),
          )
          .limit(1);

        if (overlap.length > 0) {
          throw new ORPCError("CONFLICT", {
            message: "A price entry with overlapping parameters already exists",
          });
        }

        const [row] = await db.insert(servicePrice).values(input).returning();
        return row!;
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string().min(1),
          category: z.enum(serviceCategoryEnum.enumValues),
          jobType: z.string().min(1),
          vehicleType: z.enum(quoteVehicleTypeEnum.enumValues).nullable().optional(),
          rimMaterial: z.enum(rimMaterialEnum.enumValues).nullable().optional(),
          minSize: z.number().int().min(1).nullable().optional(),
          maxSize: z.number().int().min(1).nullable().optional(),
          unitCost: z.number().int().min(0),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(servicePrice)
          .set(fields)
          .where(eq(servicePrice.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure.input(z.object({ id: z.string().min(1) })).handler(async ({ input }) => {
      await db.delete(servicePrice).where(eq(servicePrice.id, input.id));
      return { success: true as const };
    }),
  },
};
