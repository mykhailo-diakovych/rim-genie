import { Cause, Effect } from "effect";
import { and, asc, eq, or, isNull } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { PENDING_FINALIZATION_STATUS, SENT_TO_CASHIER_STATUS } from "@rim-genie/db/quote-status";
import {
  invoice,
  invoiceAuditEvent,
  invoiceModificationRequest,
  quote,
  user,
} from "@rim-genie/db/schema";
import { env } from "@rim-genie/env/server";

import { createInvoiceModificationRequestEmail } from "../emails/invoice-modification-request-email";
import * as EmailService from "./email.service";
import {
  InvalidModificationApprover,
  InvoiceModificationAlreadyPending,
  InvoiceModificationAlreadyResolved,
  InvoiceModificationNotAssigned,
  InvoiceModificationNotFound,
  InvoiceNotFound,
  InvoiceNotInCashierQueue,
} from "./errors";
import * as NotificationService from "./notification.service";

const PENDING_UNIQUE_INDEX = "invoice_modification_request_one_pending";

export function requestUrl(requestId: string) {
  return `${env.BETTER_AUTH_URL}/modification-requests/${requestId}`;
}

export function listActiveAdmins() {
  return Effect.tryPromise(() =>
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(and(eq(user.role, "admin"), or(eq(user.banned, false), isNull(user.banned))))
      .orderBy(asc(user.name)),
  );
}

function isPendingConflict(error: unknown) {
  const e = error as { constraint?: string; cause?: { constraint?: string } } | undefined;
  return (e?.cause?.constraint ?? e?.constraint) === PENDING_UNIQUE_INDEX;
}

class LeftCashierQueue extends Error {}

export function requestModification(input: {
  invoiceId: string;
  requestedById: string;
  assignedAdminId: string;
  reason?: string;
}) {
  return Effect.gen(function* () {
    const inv = yield* Effect.tryPromise(() =>
      db.query.invoice.findFirst({
        where: eq(invoice.id, input.invoiceId),
        columns: { id: true, invoiceNumber: true },
        with: {
          customer: { columns: { name: true } },
          quote: { columns: { status: true } },
        },
      }),
    );
    if (!inv) return yield* Effect.fail(new InvoiceNotFound({ id: input.invoiceId }));
    if (inv.quote.status !== SENT_TO_CASHIER_STATUS) {
      return yield* Effect.fail(new InvoiceNotInCashierQueue({ invoiceId: input.invoiceId }));
    }

    const admins = yield* listActiveAdmins();
    const admin = admins.find((a) => a.id === input.assignedAdminId);
    if (!admin) {
      return yield* Effect.fail(new InvalidModificationApprover({ userId: input.assignedAdminId }));
    }

    const reason = input.reason?.trim() || null;
    const request = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [row] = await tx
            .insert(invoiceModificationRequest)
            .values({
              invoiceId: input.invoiceId,
              requestedById: input.requestedById,
              assignedAdminId: admin.id,
              reason,
            })
            .returning();
          await tx.insert(invoiceAuditEvent).values({
            invoiceId: input.invoiceId,
            modificationRequestId: row!.id,
            type: "modification_requested",
            actorId: input.requestedById,
            details: { reason },
          });
          return row!;
        }),
      catch: (error) =>
        isPendingConflict(error)
          ? new InvoiceModificationAlreadyPending({ invoiceId: input.invoiceId })
          : new Cause.UnknownException(error),
    });

    const [cashier] = yield* Effect.tryPromise(() =>
      db.select({ name: user.name }).from(user).where(eq(user.id, input.requestedById)),
    );
    const cashierName = cashier?.name ?? "A cashier";

    yield* NotificationService.create({
      type: "invoice_modification_request",
      title: "Invoice Modification Requested",
      message: `${cashierName} requested a modification to Invoice #${inv.invoiceNumber} (${inv.customer.name})`,
      recipientId: admin.id,
      referenceId: request.id,
      referenceType: "invoice_modification_request",
    });

    // The request is already on record; a failed email is reported back, never rolled back.
    const emailError = yield* EmailService.send({
      to: admin.email,
      subject: `Invoice Modification Request — Invoice #${inv.invoiceNumber}`,
      react: createInvoiceModificationRequestEmail({
        adminName: admin.name,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        cashierName,
        reason,
        requestUrl: requestUrl(request.id),
      }),
    }).pipe(
      Effect.as(null),
      Effect.catchAll((error) => Effect.succeed(error.reason)),
    );

    return { request, emailError };
  });
}

export function getPendingForInvoice(invoiceId: string) {
  return Effect.tryPromise(() =>
    db.query.invoiceModificationRequest.findFirst({
      where: and(
        eq(invoiceModificationRequest.invoiceId, invoiceId),
        eq(invoiceModificationRequest.status, "pending"),
      ),
      with: {
        requestedBy: { columns: { id: true, name: true } },
        assignedAdmin: { columns: { id: true, name: true } },
      },
    }),
  ).pipe(Effect.map((r) => r ?? null));
}

export function listHistory(invoiceId: string) {
  return Effect.tryPromise(() =>
    db.query.invoiceAuditEvent.findMany({
      where: eq(invoiceAuditEvent.invoiceId, invoiceId),
      orderBy: (e, { asc }) => [asc(e.createdAt)],
      with: {
        actor: { columns: { id: true, name: true } },
        modificationRequest: {
          columns: { reason: true },
          with: { assignedAdmin: { columns: { id: true, name: true } } },
        },
      },
    }),
  );
}

export function getById(requestId: string, viewerId: string) {
  return Effect.gen(function* () {
    const request = yield* Effect.tryPromise(() =>
      db.query.invoiceModificationRequest.findFirst({
        where: eq(invoiceModificationRequest.id, requestId),
        with: {
          requestedBy: { columns: { id: true, name: true } },
          assignedAdmin: { columns: { id: true, name: true } },
          resolvedBy: { columns: { id: true, name: true } },
          invoice: {
            with: {
              customer: { columns: { id: true, name: true, phone: true } },
              items: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
              payments: { columns: { amount: true } },
              quote: { columns: { id: true, status: true } },
            },
          },
        },
      }),
    );
    if (!request) return yield* Effect.fail(new InvoiceModificationNotFound({ id: requestId }));

    const { payments, ...inv } = request.invoice;
    return {
      ...request,
      invoice: { ...inv, paid: payments.reduce((s, p) => s + p.amount, 0) },
      canRespond: request.status === "pending" && request.assignedAdminId === viewerId,
    };
  });
}

// Approval hands the invoice back to the floor; payments, jobs and line ids are untouched.
export function respond(input: { requestId: string; adminId: string; approve: boolean }) {
  return Effect.gen(function* () {
    const request = yield* Effect.tryPromise(() =>
      db.query.invoiceModificationRequest.findFirst({
        where: eq(invoiceModificationRequest.id, input.requestId),
        with: { invoice: { columns: { id: true, quoteId: true } } },
      }),
    );
    if (!request) {
      return yield* Effect.fail(new InvoiceModificationNotFound({ id: input.requestId }));
    }
    if (request.status !== "pending") {
      return yield* Effect.fail(new InvoiceModificationAlreadyResolved({ id: input.requestId }));
    }
    if (request.assignedAdminId !== input.adminId) {
      return yield* Effect.fail(new InvoiceModificationNotAssigned({ id: input.requestId }));
    }

    const status = input.approve ? "approved" : "rejected";
    const outcome = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [resolved] = await tx
            .update(invoiceModificationRequest)
            .set({ status, resolvedById: input.adminId, resolvedAt: new Date() })
            .where(
              and(
                eq(invoiceModificationRequest.id, input.requestId),
                eq(invoiceModificationRequest.status, "pending"),
              ),
            )
            .returning();
          if (!resolved) return "already_resolved" as const;

          if (input.approve) {
            const [moved] = await tx
              .update(quote)
              .set({ status: PENDING_FINALIZATION_STATUS })
              .where(
                and(
                  eq(quote.id, request.invoice.quoteId),
                  eq(quote.status, SENT_TO_CASHIER_STATUS),
                ),
              )
              .returning({ id: quote.id });
            if (!moved) throw new LeftCashierQueue();
          }

          await tx.insert(invoiceAuditEvent).values({
            invoiceId: request.invoiceId,
            modificationRequestId: request.id,
            type: input.approve ? "modification_approved" : "modification_rejected",
            actorId: input.adminId,
            fromStatus: input.approve ? SENT_TO_CASHIER_STATUS : null,
            toStatus: input.approve ? PENDING_FINALIZATION_STATUS : null,
          });
          return resolved;
        }),
      catch: (error) =>
        error instanceof LeftCashierQueue
          ? new InvoiceNotInCashierQueue({ invoiceId: request.invoiceId })
          : new Cause.UnknownException(error),
    });

    if (outcome === "already_resolved") {
      return yield* Effect.fail(new InvoiceModificationAlreadyResolved({ id: input.requestId }));
    }
    return outcome;
  });
}
