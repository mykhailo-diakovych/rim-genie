import { Effect } from "effect";
import { z } from "zod";

import type { db as DbClient } from "@rim-genie/db";
import { customer, quote, quoteItem } from "@rim-genie/db/schema";
import type { JobTypeEntry } from "@rim-genie/db/schema";
import { eq, ilike, or, sql, sum } from "@rim-genie/db/utils";

import { protectedProcedure } from "../index";
import { DbService, runEffect } from "../effect";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function recalcQuoteTotal(db: typeof DbClient, quoteId: string): Promise<void> {
  const result = await db
    .select({ total: sum(sql`${quoteItem.quantity} * ${quoteItem.unitCost}`) })
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, quoteId));

  const total = Number(result[0]?.total ?? 0);
  await db.update(quote).set({ total }).where(eq(quote.id, quoteId));
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const jobTypeEntrySchema = z.object({
  type: z.enum(["bend-fix", "crack-fix", "straighten", "twist", "reconstruct", "general"]),
  input: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const floorRouter = {
  customers: {
    search: protectedProcedure.input(z.object({ query: z.string().min(1) })).handler(({ input }) =>
      runEffect(
        Effect.gen(function* () {
          const db = yield* DbService;
          return yield* Effect.promise(() =>
            db
              .select()
              .from(customer)
              .where(
                or(
                  ilike(customer.phone, `%${input.query}%`),
                  ilike(customer.name, `%${input.query}%`),
                ),
              )
              .limit(20),
          );
        }),
      ),
    ),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email().optional(),
          birthdayDay: z.number().int().min(1).max(31).optional(),
          birthdayMonth: z.number().int().min(1).max(12).optional(),
        }),
      )
      .handler(({ input }) =>
        runEffect(
          Effect.gen(function* () {
            const db = yield* DbService;
            const rows = yield* Effect.promise(() => db.insert(customer).values(input).returning());
            return rows[0]!;
          }),
        ),
      ),
  },

  quotes: {
    list: protectedProcedure.handler(() =>
      runEffect(
        Effect.gen(function* () {
          const db = yield* DbService;
          return yield* Effect.promise(() =>
            db.query.quote.findMany({
              orderBy: (q, { desc }) => [desc(q.createdAt)],
              with: {
                customer: true,
                items: true,
              },
            }),
          );
        }),
      ),
    ),

    get: protectedProcedure.input(z.object({ id: z.string() })).handler(({ input }) =>
      runEffect(
        Effect.gen(function* () {
          const db = yield* DbService;
          return yield* Effect.promise(() =>
            db.query.quote.findFirst({
              where: eq(quote.id, input.id),
              with: {
                customer: true,
                createdBy: true,
                items: {
                  orderBy: (i, { asc }) => [asc(i.sortOrder)],
                },
              },
            }),
          );
        }),
      ),
    ),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.string(),
          validUntilDays: z.number().int().optional(),
        }),
      )
      .handler(({ input, context }) =>
        runEffect(
          Effect.gen(function* () {
            const db = yield* DbService;
            const validUntil = new Date(Date.now() + (input.validUntilDays ?? 7) * 86_400_000);
            const rows = yield* Effect.promise(() =>
              db
                .insert(quote)
                .values({
                  customerId: input.customerId,
                  createdById: context.session.user.id,
                  status: "draft",
                  validUntil,
                })
                .returning(),
            );
            return rows[0]!;
          }),
        ),
      ),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          comments: z.string().optional(),
          status: z.enum(["draft", "pending", "in_progress", "completed"]).optional(),
          jobRack: z.string().optional(),
        }),
      )
      .handler(({ input }) =>
        runEffect(
          Effect.gen(function* () {
            const db = yield* DbService;
            const { id, ...fields } = input;
            const rows = yield* Effect.promise(() =>
              db.update(quote).set(fields).where(eq(quote.id, id)).returning(),
            );
            return rows[0]!;
          }),
        ),
      ),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(({ input }) =>
      runEffect(
        Effect.gen(function* () {
          const db = yield* DbService;
          yield* Effect.promise(() => db.delete(quote).where(eq(quote.id, input.id)));
          return { success: true as const };
        }),
      ),
    ),

    addItem: protectedProcedure
      .input(
        z.object({
          quoteId: z.string(),
          vehicleSize: z.string().optional(),
          sideOfVehicle: z.string().optional(),
          damageLevel: z.string().optional(),
          quantity: z.number().int().min(1).default(1),
          unitCost: z.number().int().min(0).default(0),
          jobTypes: z.array(jobTypeEntrySchema).default([]),
          description: z.string().optional(),
        }),
      )
      .handler(({ input }) =>
        runEffect(
          Effect.gen(function* () {
            const db = yield* DbService;

            const existing = yield* Effect.promise(() =>
              db
                .select({ sortOrder: quoteItem.sortOrder })
                .from(quoteItem)
                .where(eq(quoteItem.quoteId, input.quoteId))
                .orderBy(sql`${quoteItem.sortOrder} desc`)
                .limit(1),
            );

            const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;

            const rows = yield* Effect.promise(() =>
              db
                .insert(quoteItem)
                .values({
                  quoteId: input.quoteId,
                  vehicleSize: input.vehicleSize,
                  sideOfVehicle: input.sideOfVehicle,
                  damageLevel: input.damageLevel,
                  quantity: input.quantity,
                  unitCost: input.unitCost,
                  jobTypes: input.jobTypes as JobTypeEntry[],
                  description: input.description,
                  sortOrder,
                })
                .returning(),
            );

            yield* Effect.promise(() => recalcQuoteTotal(db, input.quoteId));
            return rows[0]!;
          }),
        ),
      ),

    updateItem: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          vehicleSize: z.string().optional(),
          sideOfVehicle: z.string().optional(),
          damageLevel: z.string().optional(),
          quantity: z.number().int().min(1).optional(),
          unitCost: z.number().int().min(0).optional(),
          jobTypes: z.array(jobTypeEntrySchema).optional(),
          description: z.string().optional(),
          comments: z.string().optional(),
        }),
      )
      .handler(({ input }) =>
        runEffect(
          Effect.gen(function* () {
            const db = yield* DbService;
            const { id, ...fields } = input;

            const existing = yield* Effect.promise(() =>
              db.select({ quoteId: quoteItem.quoteId }).from(quoteItem).where(eq(quoteItem.id, id)),
            );

            const rows = yield* Effect.promise(() =>
              db
                .update(quoteItem)
                .set(fields as Partial<typeof quoteItem.$inferInsert>)
                .where(eq(quoteItem.id, id))
                .returning(),
            );

            const qId = existing[0]?.quoteId;
            if (qId) {
              yield* Effect.promise(() => recalcQuoteTotal(db, qId));
            }

            return rows[0]!;
          }),
        ),
      ),

    removeItem: protectedProcedure.input(z.object({ id: z.string() })).handler(({ input }) =>
      runEffect(
        Effect.gen(function* () {
          const db = yield* DbService;

          const existing = yield* Effect.promise(() =>
            db
              .select({ quoteId: quoteItem.quoteId })
              .from(quoteItem)
              .where(eq(quoteItem.id, input.id)),
          );

          yield* Effect.promise(() => db.delete(quoteItem).where(eq(quoteItem.id, input.id)));

          const qId = existing[0]?.quoteId;
          if (qId) {
            yield* Effect.promise(() => recalcQuoteTotal(db, qId));
          }

          return { success: true as const };
        }),
      ),
    ),
  },
};
