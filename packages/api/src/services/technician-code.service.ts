import { Effect } from "effect";
import { and, eq, gt, lte } from "drizzle-orm";
import { verifyPassword } from "@rim-genie/auth/crypto";

import { db } from "@rim-genie/db";
import { account, job, verification } from "@rim-genie/db/schema";

import { InvalidTechnicianCode, JobNotAccepted, JobNotFound, TechnicianCodeLocked } from "./errors";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

// The technician code is the employee's sign-in PIN, so wrong guesses are
// counted per employee and the code is locked after a few failures.
export function verifyTechnicianCode(userId: string, code: string) {
  return Effect.gen(function* () {
    const identifier = `technician-code-attempts:${userId}`;
    const now = new Date();

    const attempts = yield* Effect.tryPromise(() =>
      db.query.verification.findFirst({
        where: and(eq(verification.identifier, identifier), gt(verification.expiresAt, now)),
      }),
    );
    const failures = attempts ? Number(attempts.value) : 0;

    if (failures >= MAX_FAILED_ATTEMPTS) {
      return yield* Effect.fail(new TechnicianCodeLocked({ userId }));
    }

    const credential = yield* Effect.tryPromise(() =>
      db.query.account.findFirst({
        where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
      }),
    );

    const valid = credential?.password
      ? yield* Effect.tryPromise(() =>
          verifyPassword({ hash: credential.password!, password: code }),
        )
      : false;

    if (valid) {
      if (attempts) {
        yield* Effect.tryPromise(() =>
          db.delete(verification).where(eq(verification.identifier, identifier)),
        );
      }
      return;
    }

    if (attempts) {
      yield* Effect.tryPromise(() =>
        db
          .update(verification)
          .set({ value: String(failures + 1) })
          .where(eq(verification.id, attempts.id)),
      );
    } else {
      yield* Effect.tryPromise(() =>
        db.transaction(async (tx) => {
          await tx
            .delete(verification)
            .where(and(eq(verification.identifier, identifier), lte(verification.expiresAt, now)));
          await tx.insert(verification).values({
            id: crypto.randomUUID(),
            identifier,
            value: "1",
            expiresAt: new Date(now.getTime() + LOCK_WINDOW_MS),
          });
        }),
      );
    }

    return yield* Effect.fail(new InvalidTechnicianCode({ userId }));
  });
}

export function verifyJobTechnicianCode(jobId: string, code: string) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.job.findFirst({ where: eq(job.id, jobId), columns: { technicianId: true } }),
    );

    if (!found) {
      return yield* Effect.fail(new JobNotFound({ id: jobId }));
    }

    if (!found.technicianId) {
      return yield* Effect.fail(new JobNotAccepted({ jobId }));
    }

    yield* verifyTechnicianCode(found.technicianId, code);
  });
}
