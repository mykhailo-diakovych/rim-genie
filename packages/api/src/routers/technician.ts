import { Effect } from "effect";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { invoice, job, user } from "@rim-genie/db/schema";

import { jobBoardProcedure, protectedProcedure, technicianProcedure } from "../index";
import * as JobService from "../services/job.service";
import * as NotificationService from "../services/notification.service";
import * as ProofService from "../services/proof.service";
import * as EmailService from "../services/email.service";
import * as SmsService from "../services/sms.service";
import { verifyJobTechnicianCode, verifyTechnicianCode } from "../services/technician-code.service";
import { errorMessage, runEffect } from "../services/run-effect";
import { createJobCompletedEmail } from "../emails/job-completed-email";
import { formatCents } from "../lib/format-currency";
import { proofFileSchema } from "./proofs";

const technicianCode = z.string().regex(/^\d{4}$/);

// The customer hears once per invoice, when its last job is done. A failed send never
// undoes the completion: it is logged and returned so the technician sees why.
function notifyCustomerInvoiceCompleted(invoiceId: string): Promise<string | null> {
  const send = Effect.gen(function* () {
    const inv = yield* Effect.tryPromise(() =>
      db.query.invoice.findFirst({
        where: eq(invoice.id, invoiceId),
        with: {
          customer: true,
          quote: { columns: { quoteNumber: true } },
          items: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
        },
      }),
    );
    const cust = inv?.customer;
    if (!inv || !cust) return;

    const pref = cust.communicationPreference ?? "sms";
    const jobDesc = inv.items.map((item) => item.description ?? "Rim Job").join(", ");
    const quoteRef = inv.quote
      ? `QUO-${String(inv.quote.quoteNumber).padStart(4, "0")}`
      : `INV-${String(inv.invoiceNumber).padStart(4, "0")}`;

    if (pref === "email" && cust.email) {
      yield* EmailService.send({
        to: cust.email,
        subject: "Your Rim Repair is Complete — Rim Genie",
        react: createJobCompletedEmail({
          customerName: cust.name,
          jobDescription: jobDesc,
          invoiceNumber: inv.invoiceNumber,
        }),
      });
    } else if (pref === "sms" && cust.phone) {
      yield* SmsService.send({
        to: cust.phone,
        text: `Hi ${cust.name}, your rim repair for quote ${quoteRef} (${formatCents(inv.total)}) is complete and ready for pickup! - Rim Genie`,
      });
    }
  });

  const fail = (message: string, ...details: unknown[]) =>
    Effect.sync(() => {
      console.error(`Invoice ${invoiceId} completion notice failed: ${message}`, ...details);
      return message;
    });

  return Effect.runPromise(
    send.pipe(
      Effect.as(null),
      Effect.catchTags({
        EmailSendFailed: (error) => fail(errorMessage(error)),
        SmsSendFailed: (error) => fail(errorMessage(error)),
      }),
      Effect.catchAll((error) => fail(errorMessage(error), error)),
      Effect.catchAllDefect((defect) => fail("Something went wrong", defect)),
    ),
  );
}

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
    list: jobBoardProcedure
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

    get: jobBoardProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
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
      .input(
        z.object({
          jobId: z.string(),
          technicianId: z.string().optional(),
          code: technicianCode,
        }),
      )
      .handler(async ({ input, context }) => {
        const assigneeId = input.technicianId ?? context.session.user.id;
        return runEffect(
          Effect.gen(function* () {
            yield* verifyTechnicianCode(assigneeId, input.code);
            return yield* JobService.acceptJob(input.jobId, assigneeId);
          }),
        );
      }),

    complete: technicianProcedure
      .input(
        z.object({
          jobId: z.string(),
          code: technicianCode,
          notes: z.string().optional(),
          afterProofs: z.array(proofFileSchema).default([]),
        }),
      )
      .handler(async ({ input, context }) => {
        const notes = input.notes?.trim();
        const { job: completed, invoiceCompleted } = await runEffect(
          Effect.gen(function* () {
            yield* verifyJobTechnicianCode(input.jobId, input.code);
            const invoiceId = yield* ProofService.invoiceIdOfJob(input.jobId);
            if (input.afterProofs.length > 0) {
              yield* ProofService.registerProofs({
                invoiceId,
                jobId: input.jobId,
                stage: "after",
                files: input.afterProofs,
                uploadedById: context.session.user.id,
              });
            }
            yield* ProofService.requireAfterProof(invoiceId);
            const outcome = yield* JobService.completeJob(input.jobId);
            if (!notes) return outcome;
            return { ...outcome, job: yield* JobService.addNote(input.jobId, notes) };
          }),
        );

        // Fire-and-forget: notify admins about job completion
        try {
          const completedJob = await db.query.job.findFirst({
            where: eq(job.id, input.jobId),
            with: {
              invoiceItem: true,
              invoice: { with: { customer: true } },
            },
          });

          if (completedJob) {
            const jobDesc = completedJob.invoiceItem?.description ?? "Rim Job";
            const customerName = completedJob.invoice?.customer?.name ?? "Unknown";
            Effect.runPromise(
              NotificationService.notifyAdmins({
                type: "job_completed",
                title: "Job Completed",
                message: `${jobDesc} for ${customerName} has been completed.`,
                referenceId: completedJob.invoice?.id,
                referenceType: "invoice",
              }),
            ).catch(() => {});
          }
        } catch {
          // Notification failure must not block job completion
        }

        const customerNotificationError = invoiceCompleted
          ? await notifyCustomerInvoiceCompleted(completed.invoiceId)
          : null;

        return { ...completed, customerNotificationError };
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

    reverse: technicianProcedure
      .input(z.object({ jobId: z.string(), reason: z.string(), code: technicianCode }))
      .handler(async ({ input }) => {
        return runEffect(
          Effect.gen(function* () {
            yield* verifyJobTechnicianCode(input.jobId, input.code);
            return yield* JobService.reverseJob(input.jobId, input.reason);
          }),
        );
      }),
  },
};
