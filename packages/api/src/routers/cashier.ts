import { z } from "zod";
import { and, eq, gte, ilike, lte, or, sql, sum } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { customer, invoice, payment } from "@rim-genie/db/schema";

import { cashierProcedure } from "../index";
import * as InvoiceService from "../services/invoice.service";
import * as PaymentService from "../services/payment.service";
import * as JobService from "../services/job.service";
import { runEffect } from "../services/run-effect";

export const cashierRouter = {
  invoices: {
    list: cashierProcedure
      .input(
        z.object({
          status: z.enum(["unpaid", "partially_paid", "paid"]).optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .handler(async ({ input }) => {
        const conditions = [];

        if (input.status) {
          conditions.push(eq(invoice.status, input.status));
        }
        if (input.dateFrom) {
          conditions.push(gte(invoice.createdAt, new Date(input.dateFrom)));
        }
        if (input.dateTo) {
          conditions.push(lte(invoice.createdAt, new Date(input.dateTo)));
        }
        if (input.search) {
          conditions.push(
            or(
              ilike(customer.name, `%${input.search}%`),
              ilike(customer.phone, `%${input.search}%`),
              sql`${invoice.invoiceNumber}::text ILIKE ${`%${input.search}%`}`,
            ),
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const rows = await db
          .select({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            subtotal: invoice.subtotal,
            discount: invoice.discount,
            tax: invoice.tax,
            total: invoice.total,
            notes: invoice.notes,
            createdAt: invoice.createdAt,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerId: customer.id,
            paid: sql<number>`coalesce(${sum(payment.amount)}, 0)::int`,
          })
          .from(invoice)
          .innerJoin(customer, eq(invoice.customerId, customer.id))
          .leftJoin(payment, eq(payment.invoiceId, invoice.id))
          .where(where)
          .groupBy(invoice.id, customer.id)
          .orderBy(sql`${invoice.createdAt} desc`)
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        const [countResult] = await db
          .select({ count: sql<number>`count(distinct ${invoice.id})::int` })
          .from(invoice)
          .innerJoin(customer, eq(invoice.customerId, customer.id))
          .where(where);

        return {
          rows: rows.map((r) => ({
            ...r,
            balance: r.total - r.paid,
          })),
          total: countResult?.count ?? 0,
        };
      }),

    get: cashierProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return db.query.invoice.findFirst({
        where: eq(invoice.id, input.id),
        with: {
          customer: true,
          createdBy: true,
          items: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
          payments: {
            orderBy: (p, { desc }) => [desc(p.createdAt)],
            with: { receivedBy: true },
          },
        },
      });
    }),

    createFromQuote: cashierProcedure
      .input(z.object({ quoteId: z.string() }))
      .handler(async ({ input, context }) => {
        return runEffect(InvoiceService.createFromQuote(input.quoteId, context.session.user.id));
      }),

    update: cashierProcedure
      .input(
        z.object({
          id: z.string(),
          notes: z.string().optional(),
          discount: z.number().int().min(0).optional(),
          tax: z.number().int().min(0).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        return runEffect(InvoiceService.updateInvoice(id, fields));
      }),

    delete: cashierProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return runEffect(InvoiceService.deleteInvoice(input.id));
    }),
  },

  payments: {
    record: cashierProcedure
      .input(
        z.object({
          invoiceId: z.string(),
          amount: z.number().int().min(1),
          mode: z.enum(["credit_card", "debit_card", "bank_transfer", "cash", "cheque"]),
          reference: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        return runEffect(
          PaymentService.recordPayment(
            input.invoiceId,
            input.amount,
            input.mode,
            context.session.user.id,
            input.reference,
          ),
        );
      }),

    list: cashierProcedure.input(z.object({ invoiceId: z.string() })).handler(async ({ input }) => {
      return db.query.payment.findMany({
        where: eq(payment.invoiceId, input.invoiceId),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
        with: { receivedBy: true },
      });
    }),
  },

  jobs: {
    sendToTechnician: cashierProcedure
      .input(z.object({ invoiceId: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(JobService.sendToTechnician(input.invoiceId));
      }),
  },
};
