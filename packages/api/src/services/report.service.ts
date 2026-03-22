import { and, count, eq, gte, isNull, lt, ne, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { inventoryRecord, invoice, job, payment, user } from "@rim-genie/db/schema";

function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
}

export async function generateDailyReport(dateStr: string) {
  const { start, end } = dayRange(dateStr);

  const [
    revenueRows,
    paymentsByMode,
    completedJobsRows,
    openJobsRows,
    activeJobsRows,
    overnightRows,
    invoicesCreatedRows,
    invoicesPaidRows,
    invoicesUnpaidRows,
    totalBilledRows,
    teamRows,
    overdueRows,
    lowInventoryRows,
    unassignedRows,
    pendingInvoiceRows,
  ] = await Promise.all([
    db
      .select({
        total: sql<string>`COALESCE(SUM(${payment.amount}), 0)::text`,
        count: sql<string>`COUNT(*)::text`,
      })
      .from(payment)
      .where(and(gte(payment.createdAt, start), lt(payment.createdAt, end))),

    db
      .select({
        mode: payment.mode,
        total: sql<string>`COALESCE(SUM(${payment.amount}), 0)::text`,
        count: sql<string>`COUNT(*)::text`,
      })
      .from(payment)
      .where(and(gte(payment.createdAt, start), lt(payment.createdAt, end)))
      .groupBy(payment.mode),

    db
      .select({ count: count() })
      .from(job)
      .where(
        and(eq(job.status, "completed"), gte(job.completedAt, start), lt(job.completedAt, end)),
      ),

    db.select({ count: count() }).from(job).where(ne(job.status, "completed")),

    db
      .select({ count: count() })
      .from(job)
      .where(sql`${job.status} IN ('accepted', 'in_progress')`),

    db
      .select({ count: count() })
      .from(job)
      .where(and(eq(job.isOvernight, true), gte(job.completedAt, start), lt(job.completedAt, end))),

    db
      .select({ count: count() })
      .from(invoice)
      .where(and(gte(invoice.createdAt, start), lt(invoice.createdAt, end))),

    db.select({ count: count() }).from(invoice).where(eq(invoice.status, "paid")),

    db.select({ count: count() }).from(invoice).where(eq(invoice.status, "unpaid")),

    db
      .select({ total: sql<string>`COALESCE(SUM(${invoice.total}), 0)::text` })
      .from(invoice)
      .where(and(gte(invoice.createdAt, start), lt(invoice.createdAt, end))),

    db.execute<{
      name: string;
      activeJobs: string;
      completedJobs: string;
    }>(sql`
      SELECT
        u.name,
        COUNT(*) FILTER (WHERE j.status IN ('accepted', 'in_progress'))::text AS "activeJobs",
        COUNT(*) FILTER (WHERE j.status = 'completed' AND j.completed_at >= ${start.toISOString()}::timestamptz AND j.completed_at < ${end.toISOString()}::timestamptz)::text AS "completedJobs"
      FROM ${user} u
      LEFT JOIN ${job} j ON j.technician_id = u.id
      WHERE u.role = 'technician'
      GROUP BY u.id, u.name
      ORDER BY COUNT(*) FILTER (WHERE j.status IN ('accepted', 'in_progress')) DESC
    `),

    db
      .select({ count: count() })
      .from(job)
      .where(
        and(
          ne(job.status, "completed"),
          lt(job.dueDate, new Date()),
          sql`${job.dueDate} IS NOT NULL`,
        ),
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
    date: dateStr,
    revenue: {
      total: Number(revenueRows[0]?.total ?? "0"),
      paymentCount: Number(revenueRows[0]?.count ?? "0"),
      byMode: paymentsByMode.map((r) => ({
        mode: r.mode,
        total: Number(r.total),
        count: Number(r.count),
      })),
    },
    jobs: {
      completed: completedJobsRows[0]?.count ?? 0,
      open: openJobsRows[0]?.count ?? 0,
      active: activeJobsRows[0]?.count ?? 0,
      overnight: overnightRows[0]?.count ?? 0,
    },
    invoices: {
      created: invoicesCreatedRows[0]?.count ?? 0,
      paid: invoicesPaidRows[0]?.count ?? 0,
      unpaid: invoicesUnpaidRows[0]?.count ?? 0,
      totalBilled: Number(totalBilledRows[0]?.total ?? "0"),
    },
    teamActivity: teamRows.rows.map((r) => ({
      name: r.name,
      activeJobs: Number(r.activeJobs),
      completedJobs: Number(r.completedJobs),
    })),
    attentionItems: [
      { label: "Overdue Jobs", count: overdueRows[0]?.count ?? 0, severity: "high" as const },
      {
        label: "Inventory Discrepancies",
        count: lowInventoryRows[0]?.count ?? 0,
        severity: "medium" as const,
      },
      { label: "Unassigned Jobs", count: unassignedRows[0]?.count ?? 0, severity: "high" as const },
      {
        label: "Pending Invoices",
        count: pendingInvoiceRows[0]?.count ?? 0,
        severity: "medium" as const,
      },
    ],
  };
}
