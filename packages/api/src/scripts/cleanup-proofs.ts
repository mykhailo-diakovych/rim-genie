import { Effect } from "effect";

import { PROOF_RETENTION_DAYS, findExpiredProofs, purgeProof } from "../services/proof.service";

const dryRun = process.argv.includes("--dry-run");

const program = Effect.gen(function* () {
  const expired = yield* findExpiredProofs();
  console.log(
    `${expired.length} proof file(s) belong to invoices picked up more than ${PROOF_RETENTION_DAYS} days ago${dryRun ? " (dry run, nothing deleted)" : ""}`,
  );

  let failed = 0;
  for (const proof of expired) {
    console.log(`- ${proof.object_key} (picked up ${new Date(proof.picked_up_at).toISOString()})`);
    if (dryRun) continue;
    const result = yield* Effect.either(purgeProof(proof.id, proof.object_key));
    if (result._tag === "Left") {
      failed++;
      console.error(`  failed: ${String(result.left.error ?? result.left)}`);
    }
  }

  if (failed > 0) {
    console.error(`${failed} file(s) could not be deleted; run the script again to retry.`);
    process.exitCode = 1;
  }
});

await Effect.runPromise(program);
process.exit();
