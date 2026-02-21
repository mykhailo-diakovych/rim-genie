import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { job } from "@rim-genie/db/schema";

import { technicianProcedure } from "../index";
import * as JobService from "../services/job.service";
import { runEffect } from "../services/run-effect";

export const technicianRouter = {
  jobs: {
    list: technicianProcedure
      .input(
        z.object({
          status: z.enum(["pending", "accepted", "in_progress", "completed"]).optional(),
          technicianId: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        return db.query.job.findMany({
          where: (j, { and, eq: eqOp }) => {
            const conditions = [];
            if (input.status) conditions.push(eqOp(j.status, input.status));
            if (input.technicianId) conditions.push(eqOp(j.technicianId, input.technicianId));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
          orderBy: (j, { desc }) => [desc(j.createdAt)],
          with: {
            invoiceItem: true,
            invoice: {
              with: { customer: true },
            },
            technician: true,
          },
        });
      }),

    get: technicianProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return db.query.job.findFirst({
        where: eq(job.id, input.id),
        with: {
          invoiceItem: true,
          invoice: {
            with: { customer: true, items: true },
          },
          technician: true,
        },
      });
    }),

    accept: technicianProcedure
      .input(z.object({ jobId: z.string() }))
      .handler(async ({ input, context }) => {
        return runEffect(JobService.acceptJob(input.jobId, context.session.user.id));
      }),

    complete: technicianProcedure
      .input(z.object({ jobId: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.completeJob(input.jobId));
      }),

    setDueDate: technicianProcedure
      .input(
        z.object({
          jobId: z.string(),
          dueDate: z.string().datetime(),
          isOvernight: z.boolean().default(false),
        }),
      )
      .handler(async ({ input }) => {
        return runEffect(
          JobService.setDueDate(input.jobId, new Date(input.dueDate), input.isOvernight),
        );
      }),

    addNote: technicianProcedure
      .input(
        z.object({
          jobId: z.string(),
          specialNotes: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        return runEffect(JobService.addNote(input.jobId, input.specialNotes));
      }),
  },
};
