import { Cause, Effect, Exit, Option } from "effect";
import { ORPCError } from "@orpc/server";

const TAG_MAP: Record<
  string,
  { code: ConstructorParameters<typeof ORPCError>[0]; message: string }
> = {
  InvoiceNotFound: { code: "NOT_FOUND", message: "Invoice not found" },
  QuoteNotFound: { code: "NOT_FOUND", message: "Quote not found" },
  JobNotFound: { code: "NOT_FOUND", message: "Job not found" },
  QuoteAlreadyConverted: {
    code: "CONFLICT",
    message: "This quote has already been converted to an invoice",
  },
  InvoiceHasPayments: {
    code: "CONFLICT",
    message: "Cannot delete an invoice that has payments recorded",
  },
  InvoiceHasJobs: { code: "CONFLICT", message: "Cannot delete an invoice that has jobs assigned" },
  JobAlreadyAccepted: { code: "CONFLICT", message: "This job has already been accepted" },
  JobAlreadyCompleted: { code: "CONFLICT", message: "This job has already been completed" },
  JobsAlreadyCreated: {
    code: "CONFLICT",
    message: "Jobs have already been created for this invoice",
  },
  PaymentExceedsBalance: {
    code: "BAD_REQUEST",
    message: "Payment amount exceeds the remaining balance",
  },
  JobNotAccepted: { code: "BAD_REQUEST", message: "This job has not been accepted yet" },
  JobCannotBeReversed: { code: "BAD_REQUEST", message: "This job cannot be reversed" },
  EODAlreadyExists: { code: "CONFLICT", message: "An EOD record already exists for this date" },
  SODAlreadyExists: { code: "CONFLICT", message: "An SOD record already exists for this date" },
  EODNotFound: {
    code: "NOT_FOUND",
    message: "No EOD record found — please submit an EOD before starting the day",
  },
};

export async function runEffect<A>(effect: Effect.Effect<A, { _tag: string }>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);

  if (Exit.isSuccess(exit)) return exit.value;

  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) {
    const error = failure.value;
    const mapped = TAG_MAP[error._tag];
    throw new ORPCError(mapped?.code ?? "INTERNAL_SERVER_ERROR", {
      message: mapped?.message ?? "Something went wrong",
      data: { ...error },
    });
  }

  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Something went wrong" });
}
