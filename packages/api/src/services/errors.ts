import { Data } from "effect";

export class InvoiceNotFound extends Data.TaggedError("InvoiceNotFound")<{
  id: string;
}> {}

export class QuoteNotFound extends Data.TaggedError("QuoteNotFound")<{
  id: string;
}> {}

export class QuoteAlreadyConverted extends Data.TaggedError("QuoteAlreadyConverted")<{
  quoteId: string;
}> {}

export class PaymentExceedsBalance extends Data.TaggedError("PaymentExceedsBalance")<{
  invoiceId: string;
  balance: number;
  attempted: number;
}> {}

export class InvoiceHasPayments extends Data.TaggedError("InvoiceHasPayments")<{
  invoiceId: string;
}> {}

export class InvoiceHasJobs extends Data.TaggedError("InvoiceHasJobs")<{
  invoiceId: string;
}> {}

export class JobNotFound extends Data.TaggedError("JobNotFound")<{
  id: string;
}> {}

export class JobAlreadyAccepted extends Data.TaggedError("JobAlreadyAccepted")<{
  jobId: string;
}> {}

export class JobNotAccepted extends Data.TaggedError("JobNotAccepted")<{
  jobId: string;
}> {}

export class JobAlreadyCompleted extends Data.TaggedError("JobAlreadyCompleted")<{
  jobId: string;
}> {}

export class JobsAlreadyCreated extends Data.TaggedError("JobsAlreadyCreated")<{
  invoiceId: string;
}> {}

export class JobCannotBeReversed extends Data.TaggedError("JobCannotBeReversed")<{
  jobId: string;
}> {}

export class EODAlreadyExists extends Data.TaggedError("EODAlreadyExists")<{
  recordDate: string;
}> {}

export class SODAlreadyExists extends Data.TaggedError("SODAlreadyExists")<{
  recordDate: string;
}> {}

export class QuoteHasNoItems extends Data.TaggedError("QuoteHasNoItems")<{
  quoteId: string;
}> {}

export class EODNotFound extends Data.TaggedError("EODNotFound")<{
  recordDate: string;
}> {}

export class EmailSendFailed extends Data.TaggedError("EmailSendFailed")<{
  reason: string;
}> {}

export class SmsSendFailed extends Data.TaggedError("SmsSendFailed")<{
  reason: string;
}> {}

export class CustomerHasNoPhone extends Data.TaggedError("CustomerHasNoPhone")<{
  customerId: string;
}> {}

export class CustomerHasNoEmail extends Data.TaggedError("CustomerHasNoEmail")<{
  customerId: string;
}> {}

export class CustomerHasInvoices extends Data.TaggedError("CustomerHasInvoices")<{
  customerId: string;
}> {}

export class CustomerHasJobs extends Data.TaggedError("CustomerHasJobs")<{
  customerId: string;
}> {}

export class DiscountRequestNotFound extends Data.TaggedError("DiscountRequestNotFound")<{
  id: string;
}> {}

export class DiscountRequestAlreadyResolved extends Data.TaggedError(
  "DiscountRequestAlreadyResolved",
)<{
  id: string;
}> {}

export class DiscountRequestAlreadyPending extends Data.TaggedError(
  "DiscountRequestAlreadyPending",
)<{
  targetId: string;
}> {}
