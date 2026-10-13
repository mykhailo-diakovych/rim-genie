import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { invoice } from "./invoice";
import { job } from "./job";

export const proofStageEnum = pgEnum("proof_stage", ["before", "after"]);

export type ProofStage = (typeof proofStageEnum.enumValues)[number];

// Proofs belong to the whole invoice; jobId only records which job row they were uploaded from.
// deletedAt is set when the file is removed from storage, the row stays for the audit trail.
export const jobProof = pgTable(
  "job_proof",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "restrict" }),
    jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
    stage: proofStageEnum("stage").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    durationSeconds: integer("duration_seconds"),
    notes: text("notes"),
    uploadedById: text("uploaded_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    unique("job_proof_objectKey_unique").on(table.objectKey),
    index("job_proof_invoiceId_idx").on(table.invoiceId),
  ],
);

export const jobProofRelations = relations(jobProof, ({ one }) => ({
  invoice: one(invoice, {
    fields: [jobProof.invoiceId],
    references: [invoice.id],
  }),
  job: one(job, {
    fields: [jobProof.jobId],
    references: [job.id],
  }),
  uploadedBy: one(user, {
    fields: [jobProof.uploadedById],
    references: [user.id],
  }),
}));
