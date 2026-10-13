import { Effect } from "effect";
import { z } from "zod";

import { adminProcedure, requireRole, technicianProcedure } from "../index";
import { PROOF_MIME_TYPES } from "../lib/proof-limits";
import * as ProofService from "../services/proof.service";
import { runEffect } from "../services/run-effect";

const proofViewerProcedure = requireRole("admin", "technician", "floorManager", "cashier");

export const proofFileSchema = z.object({
  objectKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  notes: z.string().max(500).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

export const proofsRouter = {
  list: proofViewerProcedure
    .input(z.object({ invoiceId: z.string() }))
    .handler(({ input }) => runEffect(ProofService.listProofs(input.invoiceId))),

  prepareUpload: technicianProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        jobId: z.string().optional(),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(PROOF_MIME_TYPES),
        sizeBytes: z.number().int().positive(),
        durationSeconds: z.number().int().nonnegative().optional(),
      }),
    )
    .handler(({ input }) => runEffect(ProofService.prepareUpload(input))),

  // Upload outside the Done step is always the "before" stage; "after" is only recorded by
  // technician.jobs.complete.
  add: technicianProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        jobId: z.string().optional(),
        files: z.array(proofFileSchema).min(1),
        notes: z.string().max(2000).optional(),
      }),
    )
    .handler(({ input, context }) =>
      runEffect(
        Effect.gen(function* () {
          yield* ProofService.registerProofs({
            invoiceId: input.invoiceId,
            jobId: input.jobId,
            files: input.files,
            stage: "before",
            uploadedById: context.session.user.id,
          });
          const notes = input.notes?.trim();
          if (notes) yield* ProofService.addProofNote(input.invoiceId, input.jobId, notes);
        }),
      ),
    ),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(({ input }) => runEffect(ProofService.deleteProof(input.id))),
};
