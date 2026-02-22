import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { inventoryRecord } from "@rim-genie/db/schema";

import { inventoryClerkProcedure } from "../index";
import * as InventoryService from "../services/inventory.service";
import * as JobService from "../services/job.service";
import { runEffect } from "../services/run-effect";

export const inventoryRouter = {
  jobs: {
    list: inventoryClerkProcedure
      .input(
        z.object({
          status: z.enum(["pending", "accepted", "in_progress", "completed"]).optional(),
          isOvernight: z.boolean().optional(),
        }),
      )
      .handler(async ({ input }) => {
        return db.query.job.findMany({
          where: (j, { and: andOp, eq: eqOp }) => {
            const conditions = [];
            if (input.status) conditions.push(eqOp(j.status, input.status));
            if (input.isOvernight !== undefined)
              conditions.push(eqOp(j.isOvernight, input.isOvernight));
            return conditions.length > 0 ? andOp(...conditions) : undefined;
          },
          orderBy: (j, { desc: descOp }) => [descOp(j.createdAt)],
          with: {
            invoiceItem: true,
            invoice: {
              with: { customer: true },
            },
            technician: true,
          },
        });
      }),

    unfinished: inventoryClerkProcedure.handler(async () => {
      return db.query.job.findMany({
        where: (j, { and: andOp, eq: eqOp }) =>
          andOp(eqOp(j.isOvernight, true), sql`${j.status} != 'completed'`),
        orderBy: (j, { desc: descOp }) => [descOp(j.createdAt)],
        with: {
          invoiceItem: true,
          invoice: {
            with: { customer: true },
          },
          technician: true,
        },
      });
    }),

    markPickup: inventoryClerkProcedure
      .input(z.object({ jobId: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.completeJob(input.jobId));
      }),

    markMissing: inventoryClerkProcedure
      .input(z.object({ jobId: z.string(), notes: z.string().optional() }))
      .handler(async ({ input }) => {
        const note = input.notes ? `[MISSING]: ${input.notes}` : "[MISSING]";
        return runEffect(JobService.addNote(input.jobId, note));
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
