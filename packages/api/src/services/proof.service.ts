import { Effect } from "effect";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { job, jobProof } from "@rim-genie/db/schema";
import type { ProofStage } from "@rim-genie/db/schema";

import { PROOF_LIMITS, PROOF_MIME_TYPES, isProofVideo, proofSizeLimit } from "../lib/proof-limits";
import {
  AfterProofRequired,
  JobNotFound,
  ProofFileInvalid,
  ProofNotFound,
  ProofUploadNotAllowed,
} from "./errors";
import * as JobService from "./job.service";
import * as StorageService from "./storage.service";

export type ProofFile = {
  objectKey: string;
  fileName: string;
  notes?: string;
  durationSeconds?: number;
};

const MB = 1024 * 1024;

function keyPrefix(invoiceId: string) {
  return `proofs/${invoiceId}/`;
}

function checkFile(file: { mimeType: string; sizeBytes: number; durationSeconds?: number }) {
  if (!(PROOF_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return Effect.fail(new ProofFileInvalid({ reason: "Unsupported file type" }));
  }
  const limit = proofSizeLimit(file.mimeType);
  if (file.sizeBytes > limit) {
    return Effect.fail(
      new ProofFileInvalid({ reason: `File is larger than ${Math.round(limit / MB)}MB` }),
    );
  }
  if (
    isProofVideo(file.mimeType) &&
    file.durationSeconds !== undefined &&
    file.durationSeconds > PROOF_LIMITS.maxVideoSeconds
  ) {
    return Effect.fail(new ProofFileInvalid({ reason: "Videos can be at most 5 minutes long" }));
  }
  return Effect.void;
}

/** Proofs are accepted only while work on the invoice is under way (accepted / in progress). */
function requireJobInProgress(invoiceId: string, jobId?: string) {
  return Effect.gen(function* () {
    const jobs = yield* Effect.tryPromise(() =>
      db
        .select({ id: job.id, status: job.status })
        .from(job)
        .where(and(eq(job.invoiceId, invoiceId), jobId ? eq(job.id, jobId) : undefined)),
    );
    if (!jobs.some((j) => j.status === "accepted" || j.status === "in_progress")) {
      return yield* Effect.fail(new ProofUploadNotAllowed({ invoiceId }));
    }
  });
}

export function prepareUpload(input: {
  invoiceId: string;
  jobId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
}) {
  return Effect.gen(function* () {
    yield* requireJobInProgress(input.invoiceId, input.jobId);
    yield* checkFile(input);

    const safeName = input.fileName.replace(/[^\w.-]+/g, "_").slice(-100);
    const objectKey = `${keyPrefix(input.invoiceId)}${crypto.randomUUID()}-${safeName}`;
    const uploadUrl = yield* Effect.tryPromise(() => StorageService.createUploadUrl(objectKey));
    return { objectKey, uploadUrl };
  });
}

/**
 * Records files the browser already PUT to storage. The stage comes from where in the job flow
 * the call is made (Proofs while in progress, or the Done step), never from the client.
 */
export function registerProofs(input: {
  invoiceId: string;
  jobId?: string;
  stage: ProofStage;
  files: ProofFile[];
  uploadedById: string;
}) {
  return Effect.gen(function* () {
    yield* requireJobInProgress(input.invoiceId, input.jobId);

    for (const file of input.files) {
      if (!file.objectKey.startsWith(keyPrefix(input.invoiceId))) {
        return yield* Effect.fail(
          new ProofFileInvalid({ reason: "File does not belong to this job" }),
        );
      }

      const stored = yield* Effect.tryPromise(() => StorageService.headObject(file.objectKey));
      if (!stored) {
        return yield* Effect.fail(
          new ProofFileInvalid({ reason: `${file.fileName} was not uploaded` }),
        );
      }

      const mimeType = stored.contentType ?? "";
      const valid = yield* Effect.either(
        checkFile({ mimeType, sizeBytes: stored.size, durationSeconds: file.durationSeconds }),
      );
      if (valid._tag === "Left") {
        yield* Effect.tryPromise(() => StorageService.deleteObject(file.objectKey));
        return yield* Effect.fail(valid.left);
      }

      yield* Effect.tryPromise(() =>
        db
          .insert(jobProof)
          .values({
            invoiceId: input.invoiceId,
            jobId: input.jobId,
            stage: input.stage,
            objectKey: file.objectKey,
            fileName: file.fileName,
            mimeType,
            sizeBytes: stored.size,
            durationSeconds: isProofVideo(mimeType) ? file.durationSeconds : undefined,
            notes: file.notes?.trim() || null,
            uploadedById: input.uploadedById,
          })
          .onConflictDoNothing({ target: jobProof.objectKey }),
      );
    }
  });
}

/** The general note from the upload dialog goes on the job(s) the proofs were taken for. */
export function addProofNote(invoiceId: string, jobId: string | undefined, note: string) {
  return Effect.gen(function* () {
    const jobs = yield* Effect.tryPromise(() =>
      db
        .select({ id: job.id })
        .from(job)
        .where(
          and(
            eq(job.invoiceId, invoiceId),
            jobId ? eq(job.id, jobId) : inArray(job.status, ["accepted", "in_progress"]),
          ),
        ),
    );
    for (const j of jobs) {
      yield* JobService.addNote(j.id, note);
    }
  });
}

export function invoiceIdOfJob(jobId: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId), columns: { invoiceId: true } }),
    );
    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }
    return found.invoiceId;
  });
}

export function requireAfterProof(invoiceId: string) {
  return Effect.gen(function* () {
    const [row] = yield* Effect.tryPromise(() =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobProof)
        .where(
          and(
            eq(jobProof.invoiceId, invoiceId),
            eq(jobProof.stage, "after"),
            isNull(jobProof.deletedAt),
          ),
        ),
    );
    if (!row || row.count === 0) {
      return yield* Effect.fail(new AfterProofRequired({ invoiceId }));
    }
  });
}

export function listProofs(invoiceId: string) {
  return Effect.gen(function* () {
    const rows = yield* Effect.tryPromise(() =>
      db.query.jobProof.findMany({
        where: and(eq(jobProof.invoiceId, invoiceId), isNull(jobProof.deletedAt)),
        orderBy: (p, { asc }) => [asc(p.createdAt)],
        with: { uploadedBy: { columns: { id: true, name: true } } },
      }),
    );

    return yield* Effect.tryPromise(() =>
      Promise.all(
        rows.map(async ({ objectKey, ...proof }) => ({
          ...proof,
          viewUrl: await StorageService.createViewUrl(objectKey),
          downloadUrl: await StorageService.createViewUrl(objectKey, { fileName: proof.fileName }),
        })),
      ),
    );
  });
}

export function deleteProof(id: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.jobProof.findFirst({ where: and(eq(jobProof.id, id), isNull(jobProof.deletedAt)) }),
    );
    if (!found) {
      return yield* Effect.fail(new ProofNotFound({ id }));
    }

    yield* purgeProof(found.id, found.objectKey);
  });
}

/** Retention (client, 12c): files go 90 days after the customer collected the invoice. */
export const PROOF_RETENTION_DAYS = 90;

export function findExpiredProofs(now = new Date()) {
  const cutoff = new Date(now.getTime() - PROOF_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return Effect.tryPromise(() =>
    db.execute<{ id: string; object_key: string; invoice_id: string; picked_up_at: Date }>(sql`
      select p.id, p.object_key, p.invoice_id, jp.picked_up_at
      from job_proof p
      join job_pickup jp on jp.invoice_id = p.invoice_id
      where p.deleted_at is null and jp.picked_up_at < ${cutoff}
    `),
  ).pipe(Effect.map((result) => result.rows));
}

export function purgeProof(id: string, objectKey: string) {
  return Effect.gen(function* () {
    yield* Effect.tryPromise(() => StorageService.deleteObject(objectKey));
    yield* Effect.tryPromise(() =>
      db.update(jobProof).set({ deletedAt: new Date() }).where(eq(jobProof.id, id)),
    );
  });
}
