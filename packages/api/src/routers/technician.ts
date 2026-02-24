import { z } from "zod";
import { desc, eq, and } from "drizzle-orm";
import { verifyPassword } from "@rim-genie/auth/crypto";

import { db } from "@rim-genie/db";
import { account, job, user } from "@rim-genie/db/schema";

import { protectedProcedure, technicianProcedure } from "../index";
import * as JobService from "../services/job.service";
import { runEffect } from "../services/run-effect";

export const technicianRouter = {
  technicians: {
    list: protectedProcedure.handler(async () => {
      return db.query.user.findMany({
        where: eq(user.role, "technician"),
        columns: { id: true, name: true },
        orderBy: [desc(user.createdAt)],
      });
    }),
  },

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
      .input(z.object({ jobId: z.string(), technicianId: z.string().optional() }))
      .handler(async ({ input, context }) => {
        const assigneeId = input.technicianId ?? context.session.user.id;
        return runEffect(JobService.acceptJob(input.jobId, assigneeId));
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

    reverse: technicianProcedure
      .input(z.object({ jobId: z.string(), reason: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.reverseJob(input.jobId, input.reason));
      }),

    verifyPin: protectedProcedure
      .input(z.object({ userId: z.string(), pin: z.string() }))
      .handler(async ({ input }) => {
        const found = await db.query.account.findFirst({
          where: and(eq(account.userId, input.userId), eq(account.providerId, "credential")),
        });

        if (!found?.password) {
          return { valid: false };
        }

        const valid = await verifyPassword({ hash: found.password, password: input.pin });
        return { valid };
      }),
  },
};
