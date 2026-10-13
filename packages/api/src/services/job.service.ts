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
  InvoiceHasOutstandingBalance,
  InvoiceAlreadyPickedUp,
  InvoiceJobsNotReady,
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

interface MarkInvoicePickedUpInput {
  invoiceId: string;
  signatureDataUrl: string;
  notes?: string;
  pickedUpById: string;
}

export function markInvoicePickedUp({
  invoiceId,
  signatureDataUrl,
  notes,
  pickedUpById,
}: MarkInvoicePickedUpInput) {
  return Effect.gen(function* () {
    if (!isValidSignatureDataUrl(signatureDataUrl)) {
      return yield* Effect.fail(new PickupSignatureRequired({ invoiceId }));
    }

    const outcome = yield* Effect.tryPromise(() =>
      db.transaction(async (tx) => {
        // Locking the invoice and its jobs serializes concurrent pickups and keeps a job
        // from being reversed between the readiness check and the update.
        const [inv] = await tx
          .select({ total: invoice.total, customerId: invoice.customerId })
          .from(invoice)
          .where(eq(invoice.id, invoiceId))
          .for("update");
        if (!inv) return { type: "notFound" } as const;

        const jobs = await tx
          .select({ id: job.id, status: job.status, isPickedUp: job.isPickedUp })
          .from(job)
          .where(eq(job.invoiceId, invoiceId))
          .for("update");

        // Jobs already flagged as picked up predate per-invoice pickup; the rest go out together.
        const remaining = jobs.filter((j) => !j.isPickedUp);
        if (jobs.length > 0 && remaining.length === 0) return { type: "alreadyPickedUp" } as const;
        if (remaining.length === 0 || remaining.some((j) => j.status !== "completed")) {
          return { type: "notReady" } as const;
        }

        const [paidRow] = await tx
          .select({ paid: sum(payment.amount) })
          .from(payment)
          .where(eq(payment.invoiceId, invoiceId));
        const balance = inv.total - Number(paidRow?.paid ?? 0);
        if (balance > 0) return { type: "balance", balance } as const;

        const [pickup] = await tx
          .insert(jobPickup)
          .values({
            invoiceId,
            customerId: inv.customerId,
            pickedUpById,
            notes: notes?.trim() || null,
            signatureDataUrl,
          })
          .onConflictDoNothing({ target: jobPickup.invoiceId })
          .returning();
        if (!pickup) return { type: "alreadyPickedUp" } as const;

        const pickedUpJobs = await tx
          .update(job)
          .set({ isPickedUp: true })
          .where(
            and(
              eq(job.invoiceId, invoiceId),
              eq(job.isPickedUp, false),
              eq(job.status, "completed"),
            ),
          )
          .returning({ id: job.id });

        return { type: "ok", pickup, jobIds: pickedUpJobs.map((j) => j.id) } as const;
      }),
    );

    switch (outcome.type) {
      case "notFound":
        return yield* Effect.fail(new InvoiceNotFound({ id: invoiceId }));
      case "alreadyPickedUp":
        return yield* Effect.fail(new InvoiceAlreadyPickedUp({ invoiceId }));
      case "notReady":
        return yield* Effect.fail(new InvoiceJobsNotReady({ invoiceId }));
      case "balance":
        return yield* Effect.fail(
          new InvoiceHasOutstandingBalance({ invoiceId, balance: outcome.balance }),
        );
      case "ok":
        return { id: outcome.pickup.id, invoiceId, jobIds: outcome.jobIds };
    }
  });
}

// The single read path for pickup proof, so the signature can later move to object storage
// without touching callers.
export function getPickupByInvoiceId(invoiceId: string) {
  return Effect.gen(function* () {
    const row = yield* Effect.tryPromise(() =>
      db.query.jobPickup.findFirst({
        where: eq(jobPickup.invoiceId, invoiceId),
        with: { pickedUpBy: { columns: { id: true, name: true } } },
      }),
    );

    if (!row) return null;

    return {
      id: row.id,
      invoiceId: row.invoiceId,
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
