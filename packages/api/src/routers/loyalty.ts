import { z } from "zod";

import { db } from "@rim-genie/db";
import { invoice, loyaltyConfig } from "@rim-genie/db/schema";
import { eq, sql } from "drizzle-orm";

import { adminProcedure, protectedProcedure } from "../index";

const SINGLETON_ID = "singleton";

async function getOrCreateConfig() {
  const existing = await db.query.loyaltyConfig.findFirst({
    where: eq(loyaltyConfig.id, SINGLETON_ID),
  });
  if (existing) return existing;

  const [row] = await db
    .insert(loyaltyConfig)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing()
    .returning();

  return (
    row ??
    (await db.query.loyaltyConfig.findFirst({
      where: eq(loyaltyConfig.id, SINGLETON_ID),
    }))!
  );
}

export const loyaltyRouter = {
  config: {
    get: protectedProcedure.handler(async () => {
      return getOrCreateConfig();
    }),

    update: adminProcedure
      .input(
        z.object({
          purchaseThreshold: z.number().int().min(1),
          spendThreshold: z.number().int().min(1),
          rewardPercent: z.number().int().min(1).max(100),
        }),
      )
      .handler(async ({ input }) => {
        await getOrCreateConfig();
        const [row] = await db
          .update(loyaltyConfig)
          .set(input)
          .where(eq(loyaltyConfig.id, SINGLETON_ID))
          .returning();
        return row!;
      }),
  },

  customerStats: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .handler(async ({ input }) => {
      const config = await getOrCreateConfig();

      const [stats] = await db
        .select({
          paidInvoiceCount: sql<number>`count(*)::int`,
          totalSpent: sql<number>`coalesce(sum(${invoice.total}), 0)::int`,
        })
        .from(invoice)
        .where(sql`${invoice.customerId} = ${input.customerId} AND ${invoice.status} = 'paid'`);

      const paidInvoiceCount = stats?.paidInvoiceCount ?? 0;
      const totalSpent = stats?.totalSpent ?? 0;
      const isEligible =
        paidInvoiceCount >= config.purchaseThreshold || totalSpent >= config.spendThreshold;

      return {
        paidInvoiceCount,
        totalSpent,
        isEligible,
        purchaseThreshold: config.purchaseThreshold,
        spendThreshold: config.spendThreshold,
        rewardPercent: config.rewardPercent,
      };
    }),
};
