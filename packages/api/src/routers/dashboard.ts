import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { and, asc, count, countDistinct, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { customer, invoice, job, payment, user, type UserRole } from "@rim-genie/db/schema";

import { protectedProcedure } from "../index";
import {
  invoiceAtLocation,
  missingJob,
  overdueJob,
  readyForPickupJob,
  sentToCashierInvoice,
  unassignedJob,
} from "../lib/classifications";
import { lastPaymentAt } from "../lib/invoice-queries";

const rangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

type Range = { start: Date | null; end: Date };

function toRange(input: z.infer<typeof rangeSchema>): Range {
  return {
    start: input.dateFrom ? new Date(input.dateFrom) : null,
    end: input.dateTo ? new Date(input.dateTo) : new Date(),
  };
}

function previousRange({ start, end }: Range): Range | null {
  if (!start) return null;
  return { start: new Date(start.getTime() - (end.getTime() - start.getTime())), end: start };
}

function within(column: AnyColumn, { start, end }: Range) {
  return and(start ? gte(column, start) : undefined, lte(column, end));
}

function changePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const SPARKLINE_POINTS = 12;

async function sparkline(
  range: Range,
  fallbackStart: Date,
  value: SQL,
  column: AnyColumn,
  where: SQL | undefined,
): Promise<number[]> {
  const start = range.start ?? fallbackStart;
  const stepSeconds = Math.max(
    1,
    Math.ceil((range.end.getTime() - start.getTime()) / 1000 / SPARKLINE_POINTS),
  );
  const step = sql`make_interval(secs => ${stepSeconds}::int)`;
  const result = await db.execute<{ val: string }>(sql`
    SELECT (${value} WHERE ${column} >= bucket.ts AND ${column} < bucket.ts + ${step}${
      where ? sql` AND ${where}` : sql``
    })::text AS val
    FROM generate_series(0, ${SPARKLINE_POINTS - 1}::int) AS i,
      LATERAL (SELECT ${start.toISOString()}::timestamp + i * ${step} AS ts) AS bucket
    ORDER BY bucket.ts
  `);
  return result.rows.map((r) => Number(r.val));
}

async function earliestActivity(): Promise<Date> {
  const [row] = await db
    .select({ min: sql<string | null>`min(${invoice.createdAt})` })
    .from(invoice);
  return row?.min ? new Date(row.min) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

const ATTENTION_KINDS = ["unassigned", "overdue", "missing", "ready", "unpaid"] as const;

type AttentionKind = (typeof ATTENTION_KINDS)[number];

const INVENTORY_ROLES: UserRole[] = ["admin", "cashier", "manager"];

// The badge counts stay visible to every role; the records behind them only to roles
// that can already see that data elsewhere in the app.
const ATTENTION_LIST_ROLES: Record<AttentionKind, UserRole[] | null> = {
  unassigned: null,
  overdue: null,
  missing: INVENTORY_ROLES,
  ready: INVENTORY_ROLES,
  unpaid: ["admin", "floorManager", "cashier", "manager"],
};

function canListAttention(kind: AttentionKind, role: string | null | undefined): boolean {
  const roles = ATTENTION_LIST_ROLES[kind];
  return roles === null || (!!role && roles.includes(role as UserRole));
}

// Lifetime on purpose: open items must not drop out of view because of the date filter.
const unpaidInvoice = (locationId: string | null | undefined) =>
  and(eq(invoice.status, "unpaid"), sentToCashierInvoice(), invoiceAtLocation(locationId));

const paymentAtLocation = (locationId: string | null | undefined) =>
  locationId
    ? inArray(
        payment.invoiceId,
        db.select({ id: invoice.id }).from(invoice).where(invoiceAtLocation(locationId)),
      )
    : undefined;

const outstandingInvoice = (locationId: string | null | undefined) =>
  and(
    inArray(invoice.status, ["unpaid", "partially_paid"]),
    sentToCashierInvoice(),
    invoiceAtLocation(locationId),
  );

function attentionJobs(where: SQL | undefined, orderBy: SQL) {
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
    .where(where)
    .orderBy(orderBy);
}

const attentionInvoiceColumns = {
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  customerId: customer.id,
  customerName: customer.name,
  total: invoice.total,
  createdAt: invoice.createdAt,
};

export const dashboardRouter = {
  metrics: protectedProcedure.input(rangeSchema).handler(async ({ input, context }) => {
    const range = toRange(input);
    const prev = previousRange(range);
    const loc = context.locationId;
    const fallbackStart = range.start ?? (await earliestActivity());

    const revenue = (r: Range) =>
      db
        .select({ total: sql<number>`coalesce(sum(${payment.amount}), 0)::int` })
        .from(payment)
        .where(and(paymentAtLocation(loc), within(payment.createdAt, r)))
        .then((rows) => rows[0]?.total ?? 0);

    const outstanding = (r: Range) =>
      db
        .select({ count: count() })
        .from(invoice)
        .where(and(outstandingInvoice(loc), within(invoice.createdAt, r)))
        .then((rows) => rows[0]?.count ?? 0);

    const activeJob = () => inArray(job.status, ["accepted", "in_progress"]);
    const active = (r: Range) =>
      db
        .select({ count: count() })
        .from(job)
        .where(and(activeJob(), within(job.acceptedAt, r)))
        .then((rows) => rows[0]?.count ?? 0);

    const overnight = (r: Range) =>
      db
        .select({ count: count() })
        .from(job)
        .where(and(eq(job.isOvernight, true), within(job.completedAt, r)))
        .then((rows) => rows[0]?.count ?? 0);

    const [
      curRev,
      prvRev,
      curOutstanding,
      prvOutstanding,
      curActive,
      prvActive,
      curOvernight,
      prvOvernight,
      revSparkline,
      outstandingSparkline,
      activeSparkline,
      overnightSparkline,
    ] = await Promise.all([
      revenue(range),
      prev ? revenue(prev) : null,
      outstanding(range),
      prev ? outstanding(prev) : null,
      active(range),
      prev ? active(prev) : null,
      overnight(range),
      prev ? overnight(prev) : null,
      sparkline(
        range,
        fallbackStart,
        sql`SELECT coalesce(sum(${payment.amount}), 0) FROM ${payment}`,
        payment.createdAt,
        paymentAtLocation(loc),
      ),
      sparkline(
        range,
        fallbackStart,
        sql`SELECT count(*) FROM ${invoice}`,
        invoice.createdAt,
        outstandingInvoice(loc),
      ),
      sparkline(
        range,
        fallbackStart,
        sql`SELECT count(*) FROM ${job}`,
        job.acceptedAt,
        activeJob(),
      ),
      sparkline(
        range,
        fallbackStart,
        sql`SELECT count(*) FROM ${job}`,
        job.completedAt,
        eq(job.isOvernight, true),
      ),
    ]);

    const change = (current: number, previous: number | null) =>
      previous === null ? null : changePercent(current, previous);

    return [
      {
        key: "revenue",
        value: `$${(curRev / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        change: change(curRev, prvRev),
        sparkline: revSparkline,
      },
      {
        key: "open_jobs",
        value: String(curOutstanding),
        change: change(curOutstanding, prvOutstanding),
        sparkline: outstandingSparkline,
      },
      {
        key: "active_jobs",
        value: String(curActive),
        change: change(curActive, prvActive),
        sparkline: activeSparkline,
      },
      {
        key: "sleep_time",
        value: String(curOvernight),
        change: change(curOvernight, prvOvernight),
        sparkline: overnightSparkline,
      },
    ];
  }),

  teamActivity: protectedProcedure.input(rangeSchema).handler(async ({ input, context }) => {
    const { start, end } = toRange(input);
    const locId = context.locationId;
    const locationCondition = locId ? sql`AND u.location_id = ${locId}` : sql``;
    const startCondition = start
      ? sql`AND j.completed_at >= ${start.toISOString()}::timestamp`
      : sql``;

    const result = await db.execute<{
      name: string;
      activeJobs: string;
      completedToday: string;
    }>(sql`
      SELECT
        u.name,
        COUNT(*) FILTER (WHERE j.status IN ('accepted', 'in_progress'))::text AS "activeJobs",
        COUNT(*) FILTER (
          WHERE j.status = 'completed' ${startCondition}
            AND j.completed_at <= ${end.toISOString()}::timestamp
        )::text AS "completedToday"
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

  latestInvoices: protectedProcedure
    .input(
      rangeSchema.extend({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
      }),
    )
    .handler(async ({ input, context }) => {
      const where = and(
        within(invoice.createdAt, toRange(input)),
        sentToCashierInvoice(),
        invoiceAtLocation(context.locationId),
      );

      const [rows, [totalRow]] = await Promise.all([
        db
          .select({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            status: invoice.status,
            createdAt: invoice.createdAt,
            paidAt:
              sql<Date | null>`case when ${invoice.status} = 'paid' then ${lastPaymentAt} end`.mapWith(
                payment.createdAt,
              ),
            customerName: customer.name,
            customerEmail: customer.email,
          })
          .from(invoice)
          .innerJoin(customer, eq(invoice.customerId, customer.id))
          .where(where)
          .orderBy(desc(invoice.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ count: count() }).from(invoice).where(where),
      ]);

      return { rows, total: totalRow?.count ?? 0 };
    }),

  attentionRequired: protectedProcedure.handler(async ({ context }) => {
    const loc = context.locationId;
    const countJobs = (where: SQL | undefined) =>
      db
        .select({ count: count() })
        .from(job)
        .where(where)
        .then((rows) => rows[0]?.count ?? 0);

    const [unassigned, overdue, missing, ready, unpaid] = await Promise.all([
      countJobs(unassignedJob()),
      countJobs(overdueJob()),
      countJobs(missingJob()),
      db
        .select({ count: countDistinct(job.invoiceId) })
        .from(job)
        .where(readyForPickupJob())
        .then((rows) => rows[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(invoice)
        .where(unpaidInvoice(loc))
        .then((rows) => rows[0]?.count ?? 0),
    ]);
    const role = context.session.user.role;

    const item = (id: AttentionKind, count: number, severity: "high" | "medium") => ({
      id,
      count,
      severity,
      canList: canListAttention(id, role),
    });

    return {
      items: [
        item("unassigned", unassigned, "high"),
        item("overdue", overdue, "high"),
        item("missing", missing, "high"),
        item("ready", ready, "medium"),
        item("unpaid", unpaid, "medium"),
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
        case "unassigned":
          return {
            kind: "unassigned" as const,
            rows: await attentionJobs(unassignedJob(), asc(job.createdAt)),
          };
        case "overdue":
          return {
            kind: "overdue" as const,
            rows: await attentionJobs(overdueJob(), asc(job.dueDate)),
          };
        case "missing":
          return {
            kind: "missing" as const,
            rows: await attentionJobs(missingJob(), desc(job.createdAt)),
          };
        case "ready":
          return {
            kind: "ready" as const,
            rows: await db
              .select(attentionInvoiceColumns)
              .from(invoice)
              .innerJoin(customer, eq(invoice.customerId, customer.id))
              .where(
                inArray(
                  invoice.id,
                  db.select({ id: job.invoiceId }).from(job).where(readyForPickupJob()),
                ),
              )
              .orderBy(asc(invoice.createdAt)),
          };
        case "unpaid":
          return {
            kind: "unpaid" as const,
            rows: await db
              .select(attentionInvoiceColumns)
              .from(invoice)
              .innerJoin(customer, eq(invoice.customerId, customer.id))
              .where(unpaidInvoice(context.locationId))
              .orderBy(asc(invoice.createdAt)),
          };
      }
    }),
};
