import { Effect } from "effect";
import { ORPCError } from "@orpc/server";

const TAG_TO_CODE: Record<string, ConstructorParameters<typeof ORPCError>[0]> = {
  InvoiceNotFound: "NOT_FOUND",
  QuoteNotFound: "NOT_FOUND",
  JobNotFound: "NOT_FOUND",
  QuoteAlreadyConverted: "CONFLICT",
  InvoiceHasPayments: "CONFLICT",
  InvoiceHasJobs: "CONFLICT",
  JobAlreadyAccepted: "CONFLICT",
  JobAlreadyCompleted: "CONFLICT",
  JobsAlreadyCreated: "CONFLICT",
  PaymentExceedsBalance: "BAD_REQUEST",
  JobNotAccepted: "BAD_REQUEST",
};

export function runEffect<A>(effect: Effect.Effect<A, { _tag: string }>): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new ORPCError(TAG_TO_CODE[error._tag] ?? "INTERNAL_SERVER_ERROR", {
            message: error._tag,
            data: { ...error },
          }),
        ),
      ),
    ),
  );
}
