import { Effect } from "effect";
import { and, eq, sql, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { invoice, job, jobPickup, payment } from "@rim-genie/db/schema";

import {
  InvoiceNotFound,
  JobNotFound,
  JobAlreadyAccepted,
  JobNotAccepted,
  JobAlreadyCompleted,
  JobsAlreadyCreated,
  JobCannotBeReversed,
  JobHasOutstandingBalance,
  JobAlreadyPickedUp,
  PickupSignatureRequired,
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
          startedAt: new Date(),
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

export function addNote(jobId: string, note: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    const combined = found.specialNotes ? `${found.specialNotes}\n${note}` : note;

    const [updated] = yield* Effect.tryPromise(() =>
      db.update(job).set({ specialNotes: combined }).where(eq(job.id, jobId)).returning(),
    );

    return updated!;
  });
}

const SIGNATURE_PREFIX = "data:image/png;base64,";
const SIGNATURE_MAX_LENGTH = 400_000;
const BASE64_PAYLOAD = /^[A-Za-z0-9+/]+={0,2}$/;

function isValidSignatureDataUrl(value: string) {
  return (
    value.length <= SIGNATURE_MAX_LENGTH &&
    value.startsWith(SIGNATURE_PREFIX) &&
    BASE64_PAYLOAD.test(value.slice(SIGNATURE_PREFIX.length))
  );
}

interface MarkAsPickedUpInput {
  jobId: string;
  signatureDataUrl: string;
  notes?: string;
  pickedUpById: string;
}

export function markAsPickedUp({
  jobId,
  signatureDataUrl,
  notes,
  pickedUpById,
}: MarkAsPickedUpInput) {
  return Effect.gen(function* () {
    if (!isValidSignatureDataUrl(signatureDataUrl)) {
      return yield* Effect.fail(new PickupSignatureRequired({ jobId }));
    }

    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({
        where: eq(job.id, jobId),
        with: { invoice: { columns: { total: true, customerId: true } } },
      }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    if (found.isPickedUp) {
      return yield* Effect.fail(new JobAlreadyPickedUp({ jobId }));
    }

    const [paidRow] = yield* Effect.tryPromise(() =>
      db
        .select({ paid: sum(payment.amount) })
        .from(payment)
        .where(eq(payment.invoiceId, found.invoiceId)),
    );
    const balance = found.invoice.total - Number(paidRow?.paid ?? 0);
    if (balance > 0) {
      return yield* Effect.fail(new JobHasOutstandingBalance({ jobId, balance }));
    }

    const updated = yield* Effect.tryPromise(() =>
      db.transaction(async (tx) => {
        const [row] = await tx
          .update(job)
          .set({
            isPickedUp: true,
            status: "completed",
            completedAt: found.completedAt ?? new Date(),
          })
          .where(and(eq(job.id, jobId), eq(job.isPickedUp, false)))
          .returning();

        if (!row) return null;

        await tx.insert(jobPickup).values({
          jobId,
          customerId: found.invoice.customerId,
          pickedUpById,
          notes: notes?.trim() || null,
          signatureDataUrl,
        });

        return row;
      }),
    );

    if (!updated) {
      return yield* Effect.fail(new JobAlreadyPickedUp({ jobId }));
    }

    return updated;
  });
}

// The single read path for pickup proof, so the signature can later move to object storage
// without touching callers.
export function getPickupByJobId(jobId: string) {
  return Effect.gen(function* () {
    const row = yield* Effect.tryPromise(() =>
      db.query.jobPickup.findFirst({
        where: eq(jobPickup.jobId, jobId),
        with: { pickedUpBy: { columns: { id: true, name: true } } },
      }),
    );

    if (!row) return null;

    return {
      id: row.id,
      jobId: row.jobId,
      customerId: row.customerId,
      pickedUpAt: row.pickedUpAt,
      pickedUpBy: row.pickedUpBy,
      notes: row.notes,
      signatureUrl: row.signatureDataUrl,
    };
  });
}

export function markAsMissing(jobId: string, note?: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId) }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    const missingNote = note ? `[MISSING]: ${note}` : "[MISSING]";
    const combined = found.specialNotes ? `${found.specialNotes}\n${missingNote}` : missingNote;

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(job)
        .set({
          isMissing: true,
          specialNotes: combined,
        })
        .where(eq(job.id, jobId))
        .returning(),
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
          startedAt: null,
          completedAt: null,
          specialNotes: notes,
        })
        .where(eq(job.id, jobId))
        .returning(),
    );

    return updated!;
  });
}
