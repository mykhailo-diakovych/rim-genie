import { z } from "zod";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { inventoryRecord, invoice, job } from "@rim-genie/db/schema";

import { inventoryClerkProcedure } from "../index";
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

export const inventoryRouter = {
  jobs: {
    list: inventoryClerkProcedure
      .input(z.object({ tab: tabSchema, dateFrom: z.string().optional() }))
      .handler(async ({ input }) => {
        const dateFilter = input.dateFrom
          ? gte(job.createdAt, new Date(input.dateFrom))
          : undefined;

        if (input.tab === "outstandingBalance") {
          const rows = await db
            .select({
              jobId: job.id,
            })
            .from(job)
            .innerJoin(invoice, eq(job.invoiceId, invoice.id))
            .where(and(ne(invoice.status, "paid"), eq(job.isPickedUp, false), dateFilter));

          const jobIds = rows.map((r) => r.jobId);
          if (jobIds.length === 0) return [];

          return db.query.job.findMany({
            where: (j, { inArray }) => inArray(j.id, jobIds),
            orderBy: (j, { desc: descOp }) => [descOp(j.createdAt)],
            with: {
              invoiceItem: true,
              invoice: { with: { customer: true, payments: true } },
              technician: true,
            },
          });
        }

        return db.query.job.findMany({
          where: (j, { and: andOp, eq: eqOp }) => {
            const tabCondition = (() => {
              switch (input.tab) {
                case "overnight":
                  return andOp(eqOp(j.isOvernight, true), eqOp(j.isPickedUp, false));
                case "readyForPickup":
                  return andOp(eqOp(j.status, "completed"), eqOp(j.isPickedUp, false));
                case "missing":
                  return andOp(eqOp(j.isMissing, true), eqOp(j.isPickedUp, false));
                case "pickedUp":
                  return eqOp(j.isPickedUp, true);
              }
            })();
            return dateFilter ? andOp(tabCondition, dateFilter) : tabCondition;
          },
          orderBy: (j, { desc: descOp }) => [descOp(j.createdAt)],
          with: {
            invoiceItem: true,
            invoice: { with: { customer: true, payments: true } },
            technician: true,
          },
        });
      }),

    counts: inventoryClerkProcedure
      .input(z.object({ dateFrom: z.string().optional() }))
      .handler(async ({ input }) => {
        const dateFilter = input.dateFrom
          ? gte(job.createdAt, new Date(input.dateFrom))
          : undefined;

        const [overnightResult, readyResult, missingResult, pickedUpResult, outstandingResult] =
          await Promise.all([
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(job)
              .where(and(eq(job.isOvernight, true), eq(job.isPickedUp, false), dateFilter)),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(job)
              .where(and(eq(job.status, "completed"), eq(job.isPickedUp, false), dateFilter)),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(job)
              .where(and(eq(job.isMissing, true), eq(job.isPickedUp, false), dateFilter)),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(job)
              .where(and(eq(job.isPickedUp, true), dateFilter)),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(job)
              .innerJoin(invoice, eq(job.invoiceId, invoice.id))
              .where(and(ne(invoice.status, "paid"), eq(job.isPickedUp, false), dateFilter)),
          ]);

        return {
          overnight: overnightResult[0]!.count,
          readyForPickup: readyResult[0]!.count,
          outstandingBalance: outstandingResult[0]!.count,
          missing: missingResult[0]!.count,
          pickedUp: pickedUpResult[0]!.count,
        };
      }),

    markPickup: inventoryClerkProcedure
      .input(z.object({ jobId: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.markAsPickedUp(input.jobId));
      }),

    markOvernight: inventoryClerkProcedure
      .input(z.object({ jobId: z.string(), notes: z.string().optional() }))
      .handler(async ({ input }) => {
        const note = input.notes ? `[OVERNIGHT]: ${input.notes}` : "[OVERNIGHT]: Kept overnight";
        return runEffect(JobService.addNote(input.jobId, note));
      }),

    markMissing: inventoryClerkProcedure
      .input(z.object({ jobId: z.string(), notes: z.string().optional() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.markAsMissing(input.jobId, input.notes));
      }),
  },

  records: {
    createEOD: inventoryClerkProcedure
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

    createSOD: inventoryClerkProcedure
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

    list: inventoryClerkProcedure
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

    latest: inventoryClerkProcedure.handler(async () => {
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
