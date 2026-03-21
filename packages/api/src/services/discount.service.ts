import { Effect } from "effect";
import { and, eq } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { discountRequest, quote, customer } from "@rim-genie/db/schema";

import {
  DiscountRequestNotFound,
  DiscountRequestAlreadyResolved,
  DiscountRequestAlreadyPending,
  QuoteNotFound,
} from "./errors";
import * as NotificationService from "./notification.service";
import * as InvoiceService from "./invoice.service";
import { recalcQuoteTotal } from "./quote.service";

export function requestQuoteDiscount(input: {
  quoteId: string;
  requestedPercent: number;
  requestedById: string;
  reason?: string;
}) {
  return Effect.gen(function* () {
    const existing = yield* Effect.tryPromise(() =>
      db.query.discountRequest.findFirst({
        where: and(
          eq(discountRequest.quoteId, input.quoteId),
          eq(discountRequest.status, "pending"),
        ),
      }),
    );

    if (existing) {
      return yield* Effect.fail(new DiscountRequestAlreadyPending({ targetId: input.quoteId }));
    }

    const found = yield* Effect.tryPromise(() =>
      db.query.quote.findFirst({
        where: eq(quote.id, input.quoteId),
        with: { customer: true },
      }),
    );

    if (!found) {
      return yield* Effect.fail(new QuoteNotFound({ id: input.quoteId }));
    }

    const [request] = yield* Effect.tryPromise(() =>
      db
        .insert(discountRequest)
        .values({
          type: "quote",
          quoteId: input.quoteId,
          customerId: found.customerId,
          requestedById: input.requestedById,
          requestedPercent: input.requestedPercent,
          reason: input.reason,
        })
        .returning(),
    );

    yield* NotificationService.notifyAdmins({
      type: "discount_request",
      title: "Discount Approval Needed",
      message: `${input.requestedPercent}% discount requested for Quote #${found.quoteNumber} (${found.customer.name})`,
      referenceId: request!.id,
      referenceType: "discount_request",
    });

    return request!;
  });
}

export function requestCustomerDiscount(input: {
  customerId: string;
  requestedPercent: number;
  requestedById: string;
  reason?: string;
}) {
  return Effect.gen(function* () {
    const existing = yield* Effect.tryPromise(() =>
      db.query.discountRequest.findFirst({
        where: and(
          eq(discountRequest.customerId, input.customerId),
          eq(discountRequest.type, "customer"),
          eq(discountRequest.status, "pending"),
        ),
      }),
    );

    if (existing) {
      return yield* Effect.fail(new DiscountRequestAlreadyPending({ targetId: input.customerId }));
    }

    const cust = yield* Effect.tryPromise(() =>
      db.query.customer.findFirst({
        where: eq(customer.id, input.customerId),
      }),
    );

    if (!cust) {
      return yield* Effect.fail(new DiscountRequestNotFound({ id: input.customerId }));
    }

    const [request] = yield* Effect.tryPromise(() =>
      db
        .insert(discountRequest)
        .values({
          type: "customer",
          customerId: input.customerId,
          requestedById: input.requestedById,
          requestedPercent: input.requestedPercent,
          reason: input.reason,
        })
        .returning(),
    );

    yield* NotificationService.notifyAdmins({
      type: "discount_request",
      title: "Customer Discount Approval Needed",
      message: `${input.requestedPercent}% default discount requested for ${cust.name}`,
      referenceId: request!.id,
      referenceType: "discount_request",
    });

    return request!;
  });
}

export function approve(input: {
  requestId: string;
  adminId: string;
  approvedPercent?: number;
  adminNote?: string;
}) {
  return Effect.gen(function* () {
    const request = yield* Effect.tryPromise(() =>
      db.query.discountRequest.findFirst({
        where: eq(discountRequest.id, input.requestId),
        with: { quote: { with: { customer: true } }, customer: true },
      }),
    );

    if (!request) {
      return yield* Effect.fail(new DiscountRequestNotFound({ id: input.requestId }));
    }

    if (request.status !== "pending") {
      return yield* Effect.fail(new DiscountRequestAlreadyResolved({ id: input.requestId }));
    }

    const finalPercent = input.approvedPercent ?? request.requestedPercent;

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(discountRequest)
        .set({
          status: "approved",
          approvedPercent: finalPercent,
          resolvedById: input.adminId,
          resolvedAt: new Date(),
          adminNote: input.adminNote,
        })
        .where(eq(discountRequest.id, input.requestId))
        .returning(),
    );

    if (request.type === "quote" && request.quoteId) {
      yield* Effect.tryPromise(() =>
        db
          .update(quote)
          .set({ discountPercent: finalPercent })
          .where(eq(quote.id, request.quoteId!)),
      );
      yield* Effect.tryPromise(() => recalcQuoteTotal(request.quoteId!));
      yield* InvoiceService.syncInvoiceFromQuote(request.quoteId!, input.adminId).pipe(
        Effect.catchAll(() => Effect.succeed(null)),
      );
    }

    if (request.type === "customer" && request.customerId) {
      yield* Effect.tryPromise(() =>
        db
          .update(customer)
          .set({ discount: finalPercent })
          .where(eq(customer.id, request.customerId!)),
      );
    }

    const targetName =
      request.type === "quote"
        ? `Quote #${request.quote?.quoteNumber}`
        : (request.customer?.name ?? "Customer");

    yield* NotificationService.create({
      type: "discount_approved",
      title: "Discount Approved",
      message: `${finalPercent}% discount approved for ${targetName}`,
      recipientId: request.requestedById,
      referenceId: request.type === "quote" ? request.quoteId! : request.customerId!,
      referenceType: request.type === "quote" ? "quote" : "customer",
    });

    return updated!;
  });
}

export function reject(input: { requestId: string; adminId: string; adminNote?: string }) {
  return Effect.gen(function* () {
    const request = yield* Effect.tryPromise(() =>
      db.query.discountRequest.findFirst({
        where: eq(discountRequest.id, input.requestId),
        with: { quote: { with: { customer: true } }, customer: true },
      }),
    );

    if (!request) {
      return yield* Effect.fail(new DiscountRequestNotFound({ id: input.requestId }));
    }

    if (request.status !== "pending") {
      return yield* Effect.fail(new DiscountRequestAlreadyResolved({ id: input.requestId }));
    }

    const [updated] = yield* Effect.tryPromise(() =>
      db
        .update(discountRequest)
        .set({
          status: "rejected",
          resolvedById: input.adminId,
          resolvedAt: new Date(),
          adminNote: input.adminNote,
        })
        .where(eq(discountRequest.id, input.requestId))
        .returning(),
    );

    const targetName =
      request.type === "quote"
        ? `Quote #${request.quote?.quoteNumber}`
        : (request.customer?.name ?? "Customer");

    yield* NotificationService.create({
      type: "discount_rejected",
      title: "Discount Rejected",
      message: `Discount request for ${targetName} was declined`,
      recipientId: request.requestedById,
      referenceId: request.type === "quote" ? request.quoteId! : request.customerId!,
      referenceType: request.type === "quote" ? "quote" : "customer",
    });

    return updated!;
  });
}

export function getById(requestId: string) {
  return Effect.gen(function* () {
    const request = yield* Effect.tryPromise(() =>
      db.query.discountRequest.findFirst({
        where: eq(discountRequest.id, requestId),
        with: {
          quote: { with: { customer: true } },
          customer: true,
          requestedBy: { columns: { id: true, name: true, email: true } },
          resolvedBy: { columns: { id: true, name: true, email: true } },
        },
      }),
    );

    if (!request) {
      return yield* Effect.fail(new DiscountRequestNotFound({ id: requestId }));
    }

    return request;
  });
}

export function getPendingForQuote(quoteId: string) {
  return Effect.tryPromise(() =>
    db.query.discountRequest.findFirst({
      where: and(eq(discountRequest.quoteId, quoteId), eq(discountRequest.status, "pending")),
      with: {
        requestedBy: { columns: { id: true, name: true } },
      },
    }),
  ).pipe(Effect.map((r) => r ?? null));
}

export function getPendingForCustomer(customerId: string) {
  return Effect.tryPromise(() =>
    db.query.discountRequest.findFirst({
      where: and(
        eq(discountRequest.customerId, customerId),
        eq(discountRequest.type, "customer"),
        eq(discountRequest.status, "pending"),
      ),
      with: {
        requestedBy: { columns: { id: true, name: true } },
      },
    }),
  ).pipe(Effect.map((r) => r ?? null));
}
