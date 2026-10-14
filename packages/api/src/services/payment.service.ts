import { Effect } from "effect";
import { eq, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { SENT_TO_CASHIER_STATUS } from "@rim-genie/db/quote-status";
import { invoice, payment } from "@rim-genie/db/schema";
import type { PaymentMode } from "@rim-genie/db/schema";

import { InvoiceNotFound, InvoiceNotInCashierQueue, PaymentExceedsBalance } from "./errors";
import { recalcInvoiceStatus } from "./invoice.service";

export function recordPayment(
  invoiceId: string,
  amount: number,
  mode: PaymentMode,
  receivedById: string,
  reference?: string,
) {
  return Effect.gen(function* () {
    const found = yield* Effect.tryPromise(() =>
      db.query.invoice.findFirst({
        where: eq(invoice.id, invoiceId),
        with: { quote: { columns: { status: true } } },
      }),
    );

    if (!found) {
      return yield* Effect.fail(new InvoiceNotFound({ id: invoiceId }));
    }

    // An invoice back with the floor for a modification is out of the cashier queue
    if (found.quote && found.quote.status !== SENT_TO_CASHIER_STATUS) {
      return yield* Effect.fail(new InvoiceNotInCashierQueue({ invoiceId }));
    }

    const [result] = yield* Effect.tryPromise(() =>
      db
        .select({ paid: sum(payment.amount) })
        .from(payment)
        .where(eq(payment.invoiceId, invoiceId)),
    );

    const totalPaid = Number(result?.paid ?? 0);
    const balance = found.total - totalPaid;

    if (amount > balance) {
      return yield* Effect.fail(
        new PaymentExceedsBalance({ invoiceId, balance, attempted: amount }),
      );
    }

    const [recorded] = yield* Effect.tryPromise(() =>
      db.insert(payment).values({ invoiceId, amount, mode, reference, receivedById }).returning(),
    );

    yield* recalcInvoiceStatus(invoiceId);

    return recorded!;
  });
}
