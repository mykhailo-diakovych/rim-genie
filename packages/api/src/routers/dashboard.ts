import { z } from "zod";
import { and, count, eq, gte, isNull, lt, ne, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { inventoryRecord, invoice, job, payment, user } from "@rim-genie/db/schema";

import { protectedProcedure } from "../index";

const periodSchema = z.object({ period: z.enum(["today", "week", "month"]) });

function periodDates(period: "today" | "week" | "month") {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = period === "today" ? 1 : period === "week" ? 7 : 30;
  const start = new Date(startOfDay);
  start.setDate(start.getDate() - days + 1);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);
  return { start, end: now, prevStart, prevEnd: start };
}

const BUCKET_INTERVAL = {
  today: "2 hours",
  week: "14 hours",
  month: "2.5 days",
} as const;

function changePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function revenueSparkline(start: Date, end: Date, interval: string): Promise<number[]> {
  const result = await db.execute<{ val: string }>(sql`
    SELECT COALESCE(SUM(p.amount), 0)::text AS val
    FROM generate_series(
      ${start.toISOString()}::timestamptz,
      ${end.toISOString()}::timestamptz,
      ${interval}::interval
    ) AS bucket(ts)
    LEFT JOIN ${payment} p
      ON p.created_at >= bucket.ts
      AND p.created_at < bucket.ts + ${interval}::interval
    GROUP BY bucket.ts
    ORDER BY bucket.ts
    LIMIT 12
  `);
  return result.rows.map((r) => Number(r.val));
}

async function jobCountSparkline(
  start: Date,
  end: Date,
  interval: string,
  statusFilter?: string[],
): Promise<number[]> {
  const statusCondition =
    statusFilter && statusFilter.length > 0
      ? sql`AND j.status IN (${sql.join(
          statusFilter.map((s) => sql`${s}`),
          sql`, `,
        )})`
      : sql``;

  const result = await db.execute<{ val: string }>(sql`
    SELECT COUNT(j.id)::text AS val
    FROM generate_series(
      ${start.toISOString()}::timestamptz,
      ${end.toISOString()}::timestamptz,
      ${interval}::interval
    ) AS bucket(ts)
    LEFT JOIN ${job} j
      ON j.created_at >= bucket.ts
      AND j.created_at < bucket.ts + ${interval}::interval
      ${statusCondition}
    GROUP BY bucket.ts
    ORDER BY bucket.ts
    LIMIT 12
  `);
  return result.rows.map((r) => Number(r.val));
}

export const dashboardRouter = {
  metrics: protectedProcedure.input(periodSchema).handler(async ({ input }) => {
    const { start, end, prevStart, prevEnd } = periodDates(input.period);
    const interval = BUCKET_INTERVAL[input.period];

    const [
      currentRevenueRows,
      prevRevenueRows,
      openJobsRows,
      currentOpenCreatedRows,
      prevOpenCreatedRows,
      activeJobsRows,
      prevActiveRows,
      overnightRows,
      prevOvernightRows,
      revSparkline,
      openSparkline,
      activeSparkline,
      overnightSparkline,
    ] = await Promise.all([
      db
        .select({ total: sql<string>`COALESCE(SUM(${payment.amount}), 0)::text` })
        .from(payment)
        .where(and(gte(payment.createdAt, start), lt(payment.createdAt, end))),
      db
        .select({ total: sql<string>`COALESCE(SUM(${payment.amount}), 0)::text` })
        .from(payment)
        .where(and(gte(payment.createdAt, prevStart), lt(payment.createdAt, prevEnd))),
      db.select({ count: count() }).from(job).where(ne(job.status, "completed")),
      db
        .select({ count: count() })
        .from(job)
        .where(and(ne(job.status, "completed"), gte(job.createdAt, start), lt(job.createdAt, end))),
      db
        .select({ count: count() })
        .from(job)
        .where(
          and(
            ne(job.status, "completed"),
            gte(job.createdAt, prevStart),
            lt(job.createdAt, prevEnd),
          ),
        ),
      db
        .select({ count: count() })
        .from(job)
        .where(sql`${job.status} IN ('accepted', 'in_progress')`),
      db
        .select({ count: count() })
        .from(job)
        .where(
          and(
            sql`${job.status} IN ('accepted', 'in_progress')`,
            gte(job.acceptedAt, prevStart),
            lt(job.acceptedAt, prevEnd),
          ),
        ),
      db
        .select({ count: count() })
        .from(job)
        .where(
          and(eq(job.isOvernight, true), gte(job.completedAt, start), lt(job.completedAt, end)),
        ),
      db
        .select({ count: count() })
        .from(job)
        .where(
          and(
            eq(job.isOvernight, true),
            gte(job.completedAt, prevStart),
            lt(job.completedAt, prevEnd),
          ),
        ),
      revenueSparkline(start, end, interval),
      jobCountSparkline(start, end, interval),
      jobCountSparkline(start, end, interval, ["accepted", "in_progress"]),
      jobCountSparkline(start, end, interval),
    ]);

    const curRev = Number(currentRevenueRows[0]?.total ?? "0");
    const prvRev = Number(prevRevenueRows[0]?.total ?? "0");
    const openJobs = openJobsRows[0]?.count ?? 0;
    const curOpen = currentOpenCreatedRows[0]?.count ?? 0;
    const prvOpen = prevOpenCreatedRows[0]?.count ?? 0;
    const activeJobs = activeJobsRows[0]?.count ?? 0;
    const prvActive = prevActiveRows[0]?.count ?? 0;
    const overnight = overnightRows[0]?.count ?? 0;
    const prvOvernight = prevOvernightRows[0]?.count ?? 0;

    return [
      {
        key: "revenue",
        value: `$${(curRev / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        change: changePercent(curRev, prvRev),
        sparkline: revSparkline,
      },
      {
        key: "open_jobs",
        value: String(openJobs),
        change: changePercent(curOpen, prvOpen),
        sparkline: openSparkline,
      },
      {
        key: "active_jobs",
        value: String(activeJobs),
        change: changePercent(activeJobs, prvActive),
        sparkline: activeSparkline,
      },
      {
        key: "sleep_time",
        value: String(overnight),
        change: changePercent(overnight, prvOvernight),
        sparkline: overnightSparkline,
      },
    ];
  }),

  teamActivity: protectedProcedure.input(periodSchema).handler(async ({ input }) => {
    const { start } = periodDates(input.period);

    const result = await db.execute<{
      name: string;
      activeJobs: string;
      completedToday: string;
    }>(sql`
      SELECT
        u.name,
        COUNT(*) FILTER (WHERE j.status IN ('accepted', 'in_progress'))::text AS "activeJobs",
        COUNT(*) FILTER (WHERE j.status = 'completed' AND j.completed_at >= ${start.toISOString()}::timestamptz)::text AS "completedToday"
      FROM ${user} u
      LEFT JOIN ${job} j ON j.technician_id = u.id
      WHERE u.role = 'technician'
      GROUP BY u.id, u.name
      ORDER BY COUNT(*) FILTER (WHERE j.status IN ('accepted', 'in_progress')) DESC
      LIMIT 10
    `);

    return {
      rows: result.rows.map((r) => ({
        name: r.name,
        activeJobs: Number(r.activeJobs),
        completedToday: Number(r.completedToday),
      })),
    };
  }),

  attentionRequired: protectedProcedure.input(periodSchema).handler(async () => {
    const now = new Date();

    const [overdueRows, lowInventoryRows, unassignedRows, pendingRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(job)
        .where(
          and(ne(job.status, "completed"), lt(job.dueDate, now), sql`${job.dueDate} IS NOT NULL`),
        ),
      db
        .select({ count: count() })
        .from(inventoryRecord)
        .where(eq(inventoryRecord.hasDiscrepancy, true)),
      db
        .select({ count: count() })
        .from(job)
        .where(and(isNull(job.technicianId), ne(job.status, "completed"))),
      db.select({ count: count() }).from(invoice).where(eq(invoice.status, "unpaid")),
    ]);

    return {
      items: [
        {
          id: "overdue",
          label: "attention_overdue_jobs",
          count: overdueRows[0]?.count ?? 0,
          severity: "high" as const,
        },
        {
          id: "inventory",
          label: "attention_low_inventory",
          count: lowInventoryRows[0]?.count ?? 0,
          severity: "medium" as const,
        },
        {
          id: "unassigned",
          label: "attention_unassigned_jobs",
          count: unassignedRows[0]?.count ?? 0,
          severity: "high" as const,
        },
        {
          id: "invoices",
          label: "attention_pending_invoices",
          count: pendingRows[0]?.count ?? 0,
          severity: "medium" as const,
        },
      ],
    };
  }),
};
