import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@rim-genie/db";
import { SENT_TO_CASHIER_STATUS } from "@rim-genie/db/quote-status";
import {
  customer,
  inventoryRecord,
  invoice,
  job,
  payment,
  quote,
  user,
  type UserRole,
} from "@rim-genie/db/schema";

import { protectedProcedure } from "../index";

// Only invoices the floor explicitly sent to the cashier.
const sentInvoice = () =>
  inArray(
    invoice.quoteId,
    db.select({ id: quote.id }).from(quote).where(eq(quote.status, SENT_TO_CASHIER_STATUS)),
  );

const dateFromSchema = z.object({
  dateFrom: z.string().optional(),
});

function dateRange(dateFrom?: string) {
  const now = new Date();
  const start = dateFrom ? new Date(dateFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const diffDays = (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - (now.getTime() - start.getTime()));

  const interval =
    diffDays <= 1
      ? "2 hours"
      : diffDays <= 7
        ? "14 hours"
        : diffDays <= 30
          ? "2.5 days"
          : diffDays <= 90
            ? "7.5 days"
            : "30 days";

  return { start, end: now, prevStart, prevEnd: start, interval };
}

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

const ATTENTION_KINDS = ["overdue", "inventory", "unassigned", "invoices"] as const;

type AttentionKind = (typeof ATTENTION_KINDS)[number];

// The badge counts stay visible to every role; the records behind them only to roles
// that can already see that data elsewhere in the app.
const ATTENTION_LIST_ROLES: Record<AttentionKind, UserRole[] | null> = {
  overdue: null,
  unassigned: null,
  invoices: ["admin", "floorManager", "cashier", "manager"],
  inventory: ["admin", "cashier", "manager"],
};

function canListAttention(kind: AttentionKind, role: string | null | undefined): boolean {
  const roles = ATTENTION_LIST_ROLES[kind];
  return roles === null || (!!role && roles.includes(role as UserRole));
}

const attentionWhere = {
  overdue: () =>
    and(ne(job.status, "completed"), lt(job.dueDate, new Date()), sql`${job.dueDate} IS NOT NULL`),
  inventory: () => eq(inventoryRecord.hasDiscrepancy, true),
  unassigned: () => and(isNull(job.technicianId), ne(job.status, "completed")),
  invoices: () => and(eq(invoice.status, "unpaid"), sentInvoice()),
};

function attentionJobs(kind: "overdue" | "unassigned") {
  return db
    .select({
      id: job.id,
      invoiceId: job.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      status: job.status,
      technicianName: user.name,
      dueDate: job.dueDate,
      createdAt: job.createdAt,
    })
    .from(job)
    .innerJoin(invoice, eq(job.invoiceId, invoice.id))
    .innerJoin(customer, eq(invoice.customerId, customer.id))
    .leftJoin(user, eq(job.technicianId, user.id))
    .where(attentionWhere[kind]())
    .orderBy(kind === "overdue" ? asc(job.dueDate) : asc(job.createdAt));
}

const previousEod = alias(inventoryRecord, "previous_eod");

export const dashboardRouter = {
  metrics: protectedProcedure.input(dateFromSchema).handler(async ({ input }) => {
    const { start, end, prevStart, prevEnd, interval } = dateRange(input.dateFrom);

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

  teamActivity: protectedProcedure.input(dateFromSchema).handler(async ({ input, context }) => {
    const { start } = dateRange(input.dateFrom);
    const locId = context.locationId;
    const locationCondition = locId ? sql`AND u.location_id = ${locId}` : sql``;

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
      WHERE u.role = 'technician' ${locationCondition}
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

  latestInvoices: protectedProcedure.input(dateFromSchema).handler(async ({ input, context }) => {
    const { start } = dateRange(input.dateFrom);
    const locId = context.locationId;

    const conditions = [gte(invoice.createdAt, start), sentInvoice()];
    if (locId) {
      // Same fix as the cashier list — filter on the invoice's own branch.
      conditions.push(or(eq(invoice.locationId, locId), isNull(invoice.locationId))!);
    }

    const rows = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        status: invoice.status,
        createdAt: invoice.createdAt,
        customerName: customer.name,
        customerEmail: customer.email,
      })
      .from(invoice)
      .innerJoin(customer, eq(invoice.customerId, customer.id))
      .where(and(...conditions))
      .orderBy(desc(invoice.createdAt))
      .limit(10);

    return rows;
  }),

  attentionRequired: protectedProcedure.input(dateFromSchema).handler(async ({ context }) => {
    const [overdueRows, lowInventoryRows, unassignedRows, pendingRows] = await Promise.all([
      db.select({ count: count() }).from(job).where(attentionWhere.overdue()),
      db.select({ count: count() }).from(inventoryRecord).where(attentionWhere.inventory()),
      db.select({ count: count() }).from(job).where(attentionWhere.unassigned()),
      db.select({ count: count() }).from(invoice).where(attentionWhere.invoices()),
    ]);
    const role = context.session.user.role;

    return {
      items: [
        {
          id: "overdue" as const,
          label: "attention_overdue_jobs",
          count: overdueRows[0]?.count ?? 0,
          severity: "high" as const,
          canList: canListAttention("overdue", role),
        },
        {
          id: "inventory" as const,
          label: "attention_low_inventory",
          count: lowInventoryRows[0]?.count ?? 0,
          severity: "medium" as const,
          canList: canListAttention("inventory", role),
        },
        {
          id: "unassigned" as const,
          label: "attention_unassigned_jobs",
          count: unassignedRows[0]?.count ?? 0,
          severity: "high" as const,
          canList: canListAttention("unassigned", role),
        },
        {
          id: "invoices" as const,
          label: "attention_pending_invoices",
          count: pendingRows[0]?.count ?? 0,
          severity: "medium" as const,
          canList: canListAttention("invoices", role),
        },
      ],
    };
  }),

  attentionList: protectedProcedure
    .input(z.object({ kind: z.enum(ATTENTION_KINDS) }))
    .handler(async ({ input, context }) => {
      if (!canListAttention(input.kind, context.session.user.role)) {
        throw new ORPCError("FORBIDDEN");
      }

      switch (input.kind) {
        case "overdue":
          return { kind: "overdue" as const, rows: await attentionJobs("overdue") };
        case "unassigned":
          return { kind: "unassigned" as const, rows: await attentionJobs("unassigned") };
        case "invoices":
          return {
            kind: "invoices" as const,
            rows: await db
              .select({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                customerId: customer.id,
                customerName: customer.name,
                total: invoice.total,
                createdAt: invoice.createdAt,
              })
              .from(invoice)
              .innerJoin(customer, eq(invoice.customerId, customer.id))
              .where(attentionWhere.invoices())
              .orderBy(asc(invoice.createdAt)),
          };
        case "inventory":
          return {
            kind: "inventory" as const,
            rows: await db
              .select({
                id: inventoryRecord.id,
                recordDate: inventoryRecord.recordDate,
                rimCount: inventoryRecord.rimCount,
                eodRimCount: previousEod.rimCount,
                discrepancyNotes: inventoryRecord.discrepancyNotes,
                recordedByName: user.name,
              })
              .from(inventoryRecord)
              .innerJoin(user, eq(inventoryRecord.recordedById, user.id))
              .leftJoin(previousEod, eq(inventoryRecord.previousEodId, previousEod.id))
              .where(attentionWhere.inventory())
              .orderBy(desc(inventoryRecord.recordDate)),
          };
      }
    }),
};
