import { z } from "zod";

import { db } from "@rim-genie/db";
import { customer, quote, quoteItem, invoice, payment, job, service, serviceTypeEnum } from "@rim-genie/db/schema";
import type { JobTypeEntry } from "@rim-genie/db/schema";
import { asc, desc, eq, ilike, inArray, or, sql, sum } from "drizzle-orm";

import { floorManagerProcedure, protectedProcedure, requireRole } from "../index";
import * as InvoiceService from "../services/invoice.service";
import { runEffect } from "../services/run-effect";

async function recalcQuoteTotal(quoteId: string): Promise<void> {
  const result = await db
    .select({
      total: sum(
        sql`CASE WHEN ${quoteItem.inches} IS NOT NULL THEN ${quoteItem.inches} * ${quoteItem.unitCost} ELSE ${quoteItem.quantity} * ${quoteItem.unitCost} END`,
      ),
    })
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, quoteId));

  const subtotal = Number(result[0]?.total ?? 0);

  const quoteRow = await db
    .select({ discountPercent: quote.discountPercent })
    .from(quote)
    .where(eq(quote.id, quoteId));

  const discountPercent = quoteRow[0]?.discountPercent ?? 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discountAmount;

  await db.update(quote).set({ subtotal, discountAmount, total }).where(eq(quote.id, quoteId));
}

const jobTypeEntrySchema = z.object({
  type: z.enum([
    "bend-fix",
    "crack-fix",
    "straighten",
    "twist",
    "reconstruct",
    "general",
    "welding",
  ]),
  input: z.string().optional(),
});

export const floorRouter = {
  services: {
    list: protectedProcedure
      .input(z.object({ type: z.enum(serviceTypeEnum.enumValues) }))
      .handler(async ({ input }) => {
        return db
          .select()
          .from(service)
          .where(eq(service.type, input.type))
          .orderBy(asc(service.name));
      }),
  },

  customers: {
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .handler(async ({ input }) => {
        return db
          .select()
          .from(customer)
          .where(
            or(ilike(customer.phone, `%${input.query}%`), ilike(customer.name, `%${input.query}%`)),
          )
          .orderBy(desc(customer.createdAt))
          .limit(20);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email().optional(),
          birthdayDay: z.number().int().min(1).max(31).optional(),
          birthdayMonth: z.number().int().min(1).max(12).optional(),
          isVip: z.boolean().optional(),
          discount: z.number().int().min(0).max(100).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const rows = await db.insert(customer).values(input).returning();
        return rows[0]!;
      }),

    list: requireRole("admin", "floorManager", "cashier").handler(async () => {
      return db
        .select({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          birthdayDay: customer.birthdayDay,
          birthdayMonth: customer.birthdayMonth,
          isVip: customer.isVip,
          discount: customer.discount,
          quotesCount: sql<number>`count(distinct ${quote.id})::int`,
          jobsCount: sql<number>`count(${quoteItem.id})::int`,
        })
        .from(customer)
        .leftJoin(quote, eq(quote.customerId, customer.id))
        .leftJoin(quoteItem, eq(quoteItem.quoteId, quote.id))
        .groupBy(customer.id)
        .orderBy(desc(customer.createdAt));
    }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return db.query.customer.findFirst({
        where: eq(customer.id, input.id),
        with: {
          quotes: {
            orderBy: (q, { desc }) => [desc(q.createdAt)],
            with: {
              items: {
                orderBy: (i, { asc }) => [asc(i.sortOrder)],
              },
            },
          },
        },
      });
    }),

    update: floorManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email().optional(),
          birthdayDay: z.number().int().min(1).max(31).optional(),
          birthdayMonth: z.number().int().min(1).max(12).optional(),
          isVip: z.boolean().optional(),
          discount: z.number().int().min(0).max(100).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const rows = await db.update(customer).set(fields).where(eq(customer.id, id)).returning();
        return rows[0]!;
      }),
  },

  quotes: {
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .handler(async ({ input }) => {
        const search = input?.search?.trim();

        if (search && search.length > 0) {
          const pattern = `%${search}%`;
          const matchingQuoteIds = await db
            .selectDistinct({ id: quote.id })
            .from(quote)
            .leftJoin(invoice, eq(invoice.quoteId, quote.id))
            .innerJoin(customer, eq(customer.id, quote.customerId))
            .where(
              or(
                sql`${invoice.invoiceNumber}::text ILIKE ${pattern}`,
                sql`${quote.quoteNumber}::text ILIKE ${pattern}`,
                ilike(customer.name, pattern),
                ilike(customer.phone, pattern),
              ),
            );

          if (matchingQuoteIds.length === 0) return [];

          return db.query.quote.findMany({
            where: inArray(
              quote.id,
              matchingQuoteIds.map((r) => r.id),
            ),
            orderBy: (q, { desc }) => [desc(q.createdAt)],
            with: {
              customer: true,
              items: true,
              invoice: true,
            },
          });
        }

        return db.query.quote.findMany({
          orderBy: (q, { desc }) => [desc(q.createdAt)],
          with: {
            customer: true,
            items: true,
            invoice: true,
          },
        });
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return db.query.quote.findFirst({
        where: eq(quote.id, input.id),
        with: {
          customer: true,
          createdBy: true,
          items: {
            orderBy: (i, { asc }) => [asc(i.sortOrder)],
          },
          invoice: true,
        },
      });
    }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.string(),
          validUntilDays: z.number().int().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const validUntil = new Date(Date.now() + (input.validUntilDays ?? 7) * 86_400_000);

        const cust = await db.query.customer.findFirst({
          where: eq(customer.id, input.customerId),
        });
        const discountPercent = cust?.isVip && cust?.discount ? cust.discount : 0;

        const rows = await db
          .insert(quote)
          .values({
            customerId: input.customerId,
            createdById: context.session.user.id,
            status: "draft",
            validUntil,
            discountPercent,
          })
          .returning();
        return rows[0]!;
      }),

    update: floorManagerProcedure
      .input(
        z.object({
          id: z.string(),
          comments: z.string().optional(),
          jobRack: z.string().optional(),
          discountPercent: z.number().int().min(0).max(100).optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const { id, discountPercent, ...fields } = input;

        const updateFields: Record<string, unknown> = { ...fields };
        if (discountPercent !== undefined) {
          updateFields.discountPercent = discountPercent;
        }

        const rows = await db
          .update(quote)
          .set(updateFields as Partial<typeof quote.$inferInsert>)
          .where(eq(quote.id, id))
          .returning();

        if (discountPercent !== undefined) {
          await recalcQuoteTotal(id);
        }

        const itemCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(quoteItem)
          .where(eq(quoteItem.quoteId, id));

        if (itemCount[0] && itemCount[0].count > 0) {
          await runEffect(InvoiceService.syncInvoiceFromQuote(id, context.session.user.id));
        }

        return rows[0]!;
      }),

    delete: floorManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const existing = await db.query.quote.findFirst({
        where: eq(quote.id, input.id),
        with: { invoice: true },
      });

      if (!existing) throw new Error("Quote not found");

      await db.transaction(async (tx) => {
        if (existing.invoice) {
          const invoiceId = existing.invoice.id;
          await tx.delete(job).where(eq(job.invoiceId, invoiceId));
          await tx.delete(payment).where(eq(payment.invoiceId, invoiceId));
          await tx.delete(invoice).where(eq(invoice.id, invoiceId));
        }
        await tx.delete(quoteItem).where(eq(quoteItem.quoteId, input.id));
        await tx.delete(quote).where(eq(quote.id, input.id));
      });

      return { success: true as const };
    }),

    addItem: protectedProcedure
      .input(
        z.object({
          quoteId: z.string(),
          itemType: z.enum(["rim", "welding"]).default("rim"),
          vehicleSize: z.string().optional(),
          sideOfVehicle: z.string().optional(),
          damageLevel: z.string().optional(),
          quantity: z.number().int().min(1).default(1),
          unitCost: z.number().int().min(0).default(0),
          inches: z.number().int().min(1).optional(),
          jobTypes: z.array(jobTypeEntrySchema).default([]),
          description: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const existing = await db
          .select({ sortOrder: quoteItem.sortOrder })
          .from(quoteItem)
          .where(eq(quoteItem.quoteId, input.quoteId))
          .orderBy(sql`${quoteItem.sortOrder} desc`)
          .limit(1);

        const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;

        const rows = await db
          .insert(quoteItem)
          .values({
            quoteId: input.quoteId,
            itemType: input.itemType,
            vehicleSize: input.vehicleSize,
            sideOfVehicle: input.sideOfVehicle,
            damageLevel: input.damageLevel,
            quantity: input.quantity,
            unitCost: input.unitCost,
            inches: input.inches,
            jobTypes: input.jobTypes as JobTypeEntry[],
            description: input.description,
            sortOrder,
          })
          .returning();

        await recalcQuoteTotal(input.quoteId);
        return rows[0]!;
      }),

    updateItem: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          itemType: z.enum(["rim", "welding"]).optional(),
          vehicleSize: z.string().optional(),
          sideOfVehicle: z.string().optional(),
          damageLevel: z.string().optional(),
          quantity: z.number().int().min(1).optional(),
          unitCost: z.number().int().min(0).optional(),
          inches: z.number().int().min(1).nullable().optional(),
          jobTypes: z.array(jobTypeEntrySchema).optional(),
          description: z.string().optional(),
          comments: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;

        const existing = await db
          .select({ quoteId: quoteItem.quoteId })
          .from(quoteItem)
          .where(eq(quoteItem.id, id));

        const rows = await db
          .update(quoteItem)
          .set(fields as Partial<typeof quoteItem.$inferInsert>)
          .where(eq(quoteItem.id, id))
          .returning();

        const qId = existing[0]?.quoteId;
        if (qId) {
          await recalcQuoteTotal(qId);
        }

        return rows[0]!;
      }),

    removeItem: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const existing = await db
          .select({ quoteId: quoteItem.quoteId })
          .from(quoteItem)
          .where(eq(quoteItem.id, input.id));

        await db.delete(quoteItem).where(eq(quoteItem.id, input.id));

        const qId = existing[0]?.quoteId;
        if (qId) {
          await recalcQuoteTotal(qId);
        }

        return { success: true as const };
      }),
  },
};
