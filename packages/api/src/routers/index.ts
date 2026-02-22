import type { RouterClient } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import { cashierRouter } from "./cashier";
import { employeesRouter } from "./employees";
import { floorRouter } from "./floor";
import { inventoryRouter } from "./inventory";
import { manageRouter } from "./manage";
import { technicianRouter } from "./technician";

const periodSchema = z.object({ period: z.enum(["today", "week", "month"]) });

function makeSparkline(base: number, multiplier: number): number[] {
  const seed = [0.6, 0.8, 0.5, 0.9, 0.7, 1.0, 0.75, 0.85, 0.65, 0.95, 0.8, 1.0];
  return seed.map((v) => Math.round(v * base * multiplier));
}

const PERIOD_MULTIPLIER = { today: 1, week: 7, month: 30 } as const;

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session.user,
  })),
  cashier: cashierRouter,
  employees: employeesRouter,
  floor: floorRouter,
  inventory: inventoryRouter,
  manage: manageRouter,
  technician: technicianRouter,
  dashboard: {
    metrics: protectedProcedure.input(periodSchema).handler(({ input }) => {
      const m = PERIOD_MULTIPLIER[input.period];
      return [
        {
          key: "revenue",
          value: (12450 * m).toLocaleString(),
          change: 12.5,
          sparkline: makeSparkline(1000, m),
        },
        {
          key: "open_jobs",
          value: String(24 * m),
          change: -3.2,
          sparkline: makeSparkline(20, m),
        },
        {
          key: "active_jobs",
          value: String(18 * m),
          change: 8.1,
          sparkline: makeSparkline(15, m),
        },
        {
          key: "sleep_time",
          value: `${(2.4 * m).toFixed(1)}h`,
          change: -1.8,
          sparkline: makeSparkline(2, m),
        },
      ];
    }),
    teamActivity: protectedProcedure.input(periodSchema).handler(({ input }) => {
      const m = PERIOD_MULTIPLIER[input.period];
      return {
        rows: [
          { name: "Alice Johnson", activeJobs: 3 * m, completedToday: 5 * m },
          { name: "Bob Smith", activeJobs: 2 * m, completedToday: 7 * m },
          { name: "Carol Davis", activeJobs: 4 * m, completedToday: 3 * m },
          { name: "David Lee", activeJobs: 1 * m, completedToday: 9 * m },
          { name: "Eva Martinez", activeJobs: 2 * m, completedToday: 4 * m },
        ],
      };
    }),
    attentionRequired: protectedProcedure.input(periodSchema).handler(({ input }) => {
      const m = PERIOD_MULTIPLIER[input.period];
      return {
        items: [
          {
            id: "overdue",
            label: "attention_overdue_jobs",
            count: 3 * m,
            severity: "high" as const,
          },
          {
            id: "inventory",
            label: "attention_low_inventory",
            count: 7 * m,
            severity: "medium" as const,
          },
          {
            id: "unassigned",
            label: "attention_unassigned_jobs",
            count: 2 * m,
            severity: "high" as const,
          },
          {
            id: "invoices",
            label: "attention_pending_invoices",
            count: 5 * m,
            severity: "medium" as const,
          },
        ],
      };
    }),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
