import { z } from "zod";
import { and, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { customer, inventoryRecord, invoice, job } from "@rim-genie/db/schema";

import { inventoryProcedure, requireRole } from "../index";
import * as InventoryService from "../services/inventory.service";
import * as JobService from "../services/job.service";
import { runEffect } from "../services/run-effect";

const tabSchema = z.enum([
  "overnight",
  "readyForPickup",
  "outstandingBalance",
  "missing",
  "pickedUp",
]);

export type InventoryTab = z.infer<typeof tabSchema>;

const jobFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().max(100).optional(),
});

function searchFilter(search?: string) {
  const term = search?.trim();
  if (!term) return undefined;
  const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
  const invoiceNumber = /^(?:inv[\s-]*)?#?0*(\d{1,9})$/i.exec(term)?.[1];
  return inArray(
    job.invoiceId,
    db
      .select({ id: invoice.id })
      .from(invoice)
      .innerJoin(customer, eq(invoice.customerId, customer.id))
      .where(
        or(
          ilike(customer.name, pattern),
          invoiceNumber ? eq(invoice.invoiceNumber, Number(invoiceNumber)) : undefined,
        ),
      ),
  );
}

function buildJobFilter({ dateFrom, dateTo, search }: z.infer<typeof jobFilterSchema>) {
  return and(
    dateFrom ? gte(job.createdAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(job.createdAt, new Date(dateTo)) : undefined,
    searchFilter(search),
  );
}

// Invoices whose every job is either completed or already out the door. Pickup is per invoice,
// so a job only counts as ready for pickup once its whole invoice is.
const readyInvoiceIds = db
  .select({ id: job.invoiceId })
  .from(job)
  .groupBy(job.invoiceId)
  .having(sql`bool_and(${job.status} = 'completed' or ${job.isPickedUp})`);

const jobListWith = {
  invoiceItem: true,
  invoice: {
    with: {
      customer: true,
      payments: true,
      jobs: {
        columns: { id: true, status: true, isPickedUp: true },
        with: { invoiceItem: { columns: { sortOrder: true, description: true } } },
      },
    },
  },
  technician: true,
} as const;

export const inventoryRouter = {
  jobs: {
    list: inventoryProcedure
      .input(jobFilterSchema.extend({ tab: tabSchema }))
      .handler(async ({ input }) => {
        const jobFilter = buildJobFilter(input);

        if (input.tab === "outstandingBalance") {
          const rows = await db
            .select({
              jobId: job.id,
            })
            .from(job)
            .innerJoin(invoice, eq(job.invoiceId, invoice.id))
            .where(and(ne(invoice.status, "paid"), eq(job.isPickedUp, false), jobFilter));

          const jobIds = rows.map((r) => r.jobId);
          if (jobIds.length === 0) return [];

          return db.query.job.findMany({
            where: (j, { inArray }) => inArray(j.id, jobIds),
            orderBy: (j, { desc: descOp }) => [descOp(j.createdAt)],
            with: jobListWith,
          });
        }

        return db.query.job.findMany({
          where: (j, { and: andOp, eq: eqOp }) => {
            const tabCondition = (() => {
              switch (input.tab) {
                case "overnight":
                  return andOp(eqOp(j.isOvernight, true), eqOp(j.isPickedUp, false));
                case "readyForPickup":
                  return andOp(
                    eqOp(j.status, "completed"),
                    eqOp(j.isPickedUp, false),
                    inArray(j.invoiceId, readyInvoiceIds),
                  );
                case "missing":
                  return andOp(eqOp(j.isMissing, true), eqOp(j.isPickedUp, false));
                case "pickedUp":
                  return eqOp(j.isPickedUp, true);
              }
            })();
            return andOp(tabCondition, jobFilter);
          },
          orderBy: (j, { desc: descOp }) => [descOp(j.createdAt)],
          with: jobListWith,
        });
      }),

    counts: inventoryProcedure.input(jobFilterSchema).handler(async ({ input }) => {
      const jobFilter = buildJobFilter(input);

      const [overnightResult, readyResult, missingResult, pickedUpResult, outstandingResult] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(job)
            .where(and(eq(job.isOvernight, true), eq(job.isPickedUp, false), jobFilter)),
          db
            .select({ count: sql<number>`count(distinct ${job.invoiceId})::int` })
            .from(job)
            .where(
              and(
                eq(job.status, "completed"),
                eq(job.isPickedUp, false),
                inArray(job.invoiceId, readyInvoiceIds),
                jobFilter,
              ),
            ),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(job)
            .where(and(eq(job.isMissing, true), eq(job.isPickedUp, false), jobFilter)),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(job)
            .where(and(eq(job.isPickedUp, true), jobFilter)),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(job)
            .innerJoin(invoice, eq(job.invoiceId, invoice.id))
            .where(and(ne(invoice.status, "paid"), eq(job.isPickedUp, false), jobFilter)),
        ]);

      return {
        overnight: overnightResult[0]!.count,
        readyForPickup: readyResult[0]!.count,
        outstandingBalance: outstandingResult[0]!.count,
        missing: missingResult[0]!.count,
        pickedUp: pickedUpResult[0]!.count,
      };
    }),

    markInvoicePickup: inventoryProcedure
      .input(
        z.object({
          invoiceId: z.string(),
          signatureDataUrl: z.string(),
          notes: z.string().max(2000).optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        return runEffect(
          JobService.markInvoicePickedUp({ ...input, pickedUpById: context.session.user.id }),
        );
      }),

    markOvernight: inventoryProcedure
      .input(z.object({ jobId: z.string(), notes: z.string().optional() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.markAsOvernight(input.jobId, input.notes));
      }),

    markMissing: inventoryProcedure
      .input(z.object({ jobId: z.string(), notes: z.string().optional() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.markAsMissing(input.jobId, input.notes));
      }),

    updateNote: inventoryProcedure
      .input(
        z.object({
          jobId: z.string(),
          noteType: z.enum(["OVERNIGHT", "MISSING"]),
          newNote: z.string().min(1),
        }),
      )
      .handler(async ({ input }) => {
        const existing = await db.query.job.findFirst({ where: eq(job.id, input.jobId) });
        const tag = `[${input.noteType}]:`;
        const lines = (existing?.specialNotes ?? "").split("\n");
        const updatedLines = lines.map((line) =>
          line.startsWith(tag) ? `${tag} ${input.newNote}` : line,
        );
        if (!lines.some((l) => l.startsWith(tag))) {
          updatedLines.push(`${tag} ${input.newNote}`);
        }
        await db
          .update(job)
          .set({ specialNotes: updatedLines.join("\n") })
          .where(eq(job.id, input.jobId));
      }),
  },

  pickups: {
    getByInvoiceId: requireRole("admin", "floorManager", "cashier", "manager")
      .input(z.object({ invoiceId: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.getPickupByInvoiceId(input.invoiceId));
      }),
  },

  records: {
    createEOD: inventoryProcedure
      .input(
        z.object({
          recordDate: z.string(),
          rimCount: z.number().int().min(0),
          notes: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        return runEffect(
          InventoryService.createEOD({
            ...input,
            recordedById: context.session.user.id,
          }),
        );
      }),

    createSOD: inventoryProcedure
      .input(
        z.object({
          recordDate: z.string(),
          rimCount: z.number().int().min(0),
          notes: z.string().optional(),
          discrepancyNotes: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        return runEffect(
          InventoryService.createSOD({
            ...input,
            recordedById: context.session.user.id,
          }),
        );
      }),

    list: inventoryProcedure
      .input(
        z.object({
          type: z.enum(["eod", "sod"]).optional(),
          hasDiscrepancy: z.boolean().optional(),
        }),
      )
      .handler(async ({ input }) => {
        return db.query.inventoryRecord.findMany({
          where: (r, { and: andOp, eq: eqOp }) => {
            const conditions = [];
            if (input.type) conditions.push(eqOp(r.type, input.type));
            if (input.hasDiscrepancy !== undefined)
              conditions.push(eqOp(r.hasDiscrepancy, input.hasDiscrepancy));
            return conditions.length > 0 ? andOp(...conditions) : undefined;
          },
          orderBy: (r, { desc: descOp }) => [descOp(r.recordDate), descOp(r.createdAt)],
          with: { recordedBy: { columns: { id: true, name: true } } },
        });
      }),

    latest: inventoryProcedure.handler(async () => {
      const [latestEod, latestSod] = await Promise.all([
        db.query.inventoryRecord.findFirst({
          where: eq(inventoryRecord.type, "eod"),
          orderBy: [desc(inventoryRecord.recordDate)],
          with: { recordedBy: { columns: { id: true, name: true } } },
        }),
        db.query.inventoryRecord.findFirst({
          where: eq(inventoryRecord.type, "sod"),
          orderBy: [desc(inventoryRecord.recordDate)],
          with: { recordedBy: { columns: { id: true, name: true } } },
        }),
      ]);
      return { eod: latestEod ?? null, sod: latestSod ?? null };
    }),
  },
};
