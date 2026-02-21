import { Effect } from "effect";
import { eq, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { invoice, job } from "@rim-genie/db/schema";

import {
  InvoiceNotFound,
  JobNotFound,
  JobAlreadyAccepted,
  JobNotAccepted,
  JobAlreadyCompleted,
  JobsAlreadyCreated,
  JobCannotBeReversed,
} from "./errors";

export function sendToTechnician(invoiceId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.invoice.findFirst({
        where: eq(invoice.id, invoiceId),
        with: { items: true },
      }),
    );

    if (!found) {
      return yield* Effect.fail(new InvoiceNotFound({ id: invoiceId }));
    }

    const [existing] = yield* Effect.tryPromise(() =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(job)
        .where(eq(job.invoiceId, invoiceId)),
    );

    if (existing && existing.count > 0) {
      return yield* Effect.fail(new JobsAlreadyCreated({ invoiceId }));
    }

    const jobs = yield* Effect.tryPromise(() =>
      db
        .insert(job)
        .values(
          found.items.map((item) => ({
            invoiceId,
            invoiceItemId: item.id,
            status: "pending" as const,
          })),
        )
        .returning(),
    );

    return jobs;
  });
}

export function acceptJob(jobId: string, technicianId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    if (found.status !== "pending") {
      return yield* Effect.fail(new JobAlreadyAccepted({ jobId }));
    }

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(job)
        .set({
          technicianId,
          status: "accepted",
          acceptedAt: new Date(),
        })
        .where(eq(job.id, jobId))
        .returning(),
    );

    return updated!;
  });
}

export function completeJob(jobId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    if (found.status === "completed") {
      return yield* Effect.fail(new JobAlreadyCompleted({ jobId }));
    }

    if (found.status === "pending") {
      return yield* Effect.fail(new JobNotAccepted({ jobId }));
    }

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(job)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(job.id, jobId))
        .returning(),
    );

    return updated!;
  });
}

export function setDueDate(jobId: string, dueDate: Date, isOvernight: boolean) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    const [updated] = yield* Effect.tryPromise(() =>
      db.update(job).set({ dueDate, isOvernight }).where(eq(job.id, jobId)).returning(),
    );

    return updated!;
  });
}

export function addNote(jobId: string, specialNotes: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    const [updated] = yield* Effect.tryPromise(() =>
      db.update(job).set({ specialNotes }).where(eq(job.id, jobId)).returning(),
    );

    return updated!;
  });
}

export function reverseJob(jobId: string, reason: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    if (found.status === "pending") {
      return yield* Effect.fail(new JobCannotBeReversed({ jobId }));
    }

    const notes = found.specialNotes
      ? `${found.specialNotes}\n[REVERSED]: ${reason}`
      : `[REVERSED]: ${reason}`;

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(job)
        .set({
          status: "pending",
          technicianId: null,
          acceptedAt: null,
          completedAt: null,
          specialNotes: notes,
        })
        .where(eq(job.id, jobId))
        .returning(),
    );

    return updated!;
  });
}
