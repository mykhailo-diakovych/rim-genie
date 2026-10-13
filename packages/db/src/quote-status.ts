import type { quoteStatusEnum } from "./schema/floor";


export type QuoteStatus = (typeof quoteStatusEnum.enumValues)[number];

const EDITABLE_STATUSES: readonly QuoteStatus[] = ["draft", "finalized", "pending"];

export const SENT_TO_CASHIER_STATUS = "completed" satisfies QuoteStatus;

// Once sent, the quote and its invoice are read-only for every role
export function isQuoteEditable(status: QuoteStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function canFinalizeQuote(status: QuoteStatus): boolean {
  return status === "draft" || status === "pending";
}
