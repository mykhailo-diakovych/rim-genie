import type { quoteStatusEnum } from "./schema/floor";

export type QuoteStatus = (typeof quoteStatusEnum.enumValues)[number];

const EDITABLE_STATUSES: readonly QuoteStatus[] = [
  "draft",
  "finalized",
  "pending",
  "pending_finalization",
];

export const SENT_TO_CASHIER_STATUS = "completed" satisfies QuoteStatus;

// An approved modification request hands a sent invoice back to the floor
export const PENDING_FINALIZATION_STATUS = "pending_finalization" satisfies QuoteStatus;

// Once sent, the quote and its invoice are read-only for every role
export function isQuoteEditable(status: QuoteStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function canFinalizeQuote(status: QuoteStatus): boolean {
  return status === "draft" || status === "pending" || status === PENDING_FINALIZATION_STATUS;
}
