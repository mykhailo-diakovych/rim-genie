import { z } from "zod";

import { db } from "@rim-genie/db";
import { service, serviceTypeEnum, vehicleTypeEnum } from "@rim-genie/db/schema";
import { and, asc, count, eq, ilike } from "drizzle-orm";

import { adminProcedure } from "../index";

const serviceBodySchema = z.object({
  name: z.string().min(1),
  type: z.enum(serviceTypeEnum.enumValues),
  vehicleType: z.enum(vehicleTypeEnum.enumValues).nullable().optional(),
  minSize: z.coerce.number().positive(),
  maxSize: z.coerce.number().positive(),
  unitCost: z.number().int().min(0),
});

export const manageRouter = {
  services: {
    list: adminProcedure
      .input(
        z.object({
          type: z.enum(serviceTypeEnum.enumValues),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(10),
          search: z.string().default(""),
        }),
      )
      .handler(async ({ input }) => {
        const { type, page, pageSize, search } = input;
        const offset = (page - 1) * pageSize;

        const where = and(
          eq(service.type, type),
          search ? ilike(service.name, `%${search}%`) : undefined,
        );

        const [items, [totalRow]] = await Promise.all([
          db.select().from(service).where(where).orderBy(asc(service.name)).limit(pageSize).offset(offset),
          db.select({ total: count() }).from(service).where(where),
        ]);

        return { items, total: totalRow?.total ?? 0 };
      }),

    create: adminProcedure.input(serviceBodySchema).handler(async ({ input }) => {
      const [row] = await db
        .insert(service)
        .values({ ...input, minSize: String(input.minSize), maxSize: String(input.maxSize) })
        .returning();
      return row!;
    }),

    update: adminProcedure
      .input(serviceBodySchema.extend({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const [row] = await db
          .update(service)
          .set({ ...fields, minSize: String(fields.minSize), maxSize: String(fields.maxSize) })
          .where(eq(service.id, id))
          .returning();
        return row!;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(service).where(eq(service.id, input.id));
        return { success: true as const };
      }),
  },
};
