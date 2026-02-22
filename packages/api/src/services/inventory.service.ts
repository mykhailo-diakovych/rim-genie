import { Effect } from "effect";
import { and, eq, desc, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { inventoryRecord, job } from "@rim-genie/db/schema";

import { EODAlreadyExists, SODAlreadyExists, EODNotFound } from "./errors";

export function createEOD(input: {
  recordDate: string;
  rimCount: number;
  notes?: string;
  recordedById: string;
}) {
  return Effect.gen(function* () {
    const existing = yield* Effect.tryPromise(() =>
      db.query.inventoryRecord.findFirst({
        where: and(
          eq(inventoryRecord.type, "eod"),
          eq(inventoryRecord.recordDate, input.recordDate),
        ),
      }),
    );

    if (existing) {
      return yield* Effect.fail(new EODAlreadyExists({ recordDate: input.recordDate }));
    }

    const [unfinished] = yield* Effect.tryPromise(() =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(job)
        .where(and(eq(job.isOvernight, true), sql`${job.status} != 'completed'`)),
    );

    const [record] = yield* Effect.tryPromise(() =>
      db
        .insert(inventoryRecord)
        .values({
          type: "eod",
          recordDate: input.recordDate,
          unfinishedJobCount: unfinished?.count ?? 0,
          rimCount: input.rimCount,
          notes: input.notes,
          recordedById: input.recordedById,
        })
        .returning(),
    );

    return record!;
  });
}

export function createSOD(input: {
  recordDate: string;
  rimCount: number;
  notes?: string;
  discrepancyNotes?: string;
  recordedById: string;
}) {
  return Effect.gen(function* () {
    const existing = yield* Effect.tryPromise(() =>
      db.query.inventoryRecord.findFirst({
        where: and(
          eq(inventoryRecord.type, "sod"),
          eq(inventoryRecord.recordDate, input.recordDate),
        ),
      }),
    );

    if (existing) {
      return yield* Effect.fail(new SODAlreadyExists({ recordDate: input.recordDate }));
    }

    const latestEod = yield* Effect.tryPromise(() =>
      db.query.inventoryRecord.findFirst({
        where: eq(inventoryRecord.type, "eod"),
        orderBy: [desc(inventoryRecord.recordDate)],
      }),
    );

    if (!latestEod) {
      return yield* Effect.fail(new EODNotFound({ recordDate: input.recordDate }));
    }

    const hasDiscrepancy = input.rimCount !== latestEod.rimCount;

    const [unfinished] = yield* Effect.tryPromise(() =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(job)
        .where(and(eq(job.isOvernight, true), sql`${job.status} != 'completed'`)),
    );

    const [record] = yield* Effect.tryPromise(() =>
      db
        .insert(inventoryRecord)
        .values({
          type: "sod",
          recordDate: input.recordDate,
          unfinishedJobCount: unfinished?.count ?? 0,
          rimCount: input.rimCount,
          previousEodId: latestEod.id,
          hasDiscrepancy,
          discrepancyNotes: hasDiscrepancy ? input.discrepancyNotes : null,
          notes: input.notes,
          recordedById: input.recordedById,
        })
        .returning(),
    );

    return record!;
  });
}
