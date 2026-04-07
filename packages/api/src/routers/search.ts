import { z } from "zod";

import { db } from "@rim-genie/db";
import { customer, quote, invoice, user } from "@rim-genie/db/schema";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { protectedProcedure } from "../index";

const searchFilterEnum = z.enum(["all", "customer", "quote", "invoice"]);

export const searchRouter = {
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        filter: searchFilterEnum.default("all"),
      }),
    )
    .handler(async ({ input }) => {
      const pattern = `%${input.query}%`;
      const { filter } = input;
      const isNumericQuery = /^\d+$/.test(input.query);

      const emptyCustomers: { id: string; name: string; phone: string; email: string | null }[] =
        [];
      const emptyQuotes: {
        id: string;
        quoteNumber: number;
        status: string;
        customerName: string;
      }[] = [];
      const emptyInvoices: {
        id: string;
        invoiceNumber: number;
        status: string;
        customerName: string;
      }[] = [];
      const emptyEmployees: {
        id: string;
        name: string;
        email: string;
        role: string | null;
      }[] = [];

      const [customers, quotes, invoices, employees] = await Promise.all([
        filter === "all" || filter === "customer"
          ? db
              .select({
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
              })
              .from(customer)
              .where(
                and(
                  isNull(customer.deletedAt),
                  isNumericQuery
                    ? ilike(customer.phone, pattern)
                    : or(
                        ilike(customer.name, pattern),
                        ilike(customer.phone, pattern),
                        ilike(customer.email, pattern),
                      ),
                ),
              )
              .orderBy(desc(customer.createdAt))
              .limit(filter === "customer" ? 20 : 5)
          : emptyCustomers,

        filter === "all" || filter === "quote"
          ? db
              .select({
                id: quote.id,
                quoteNumber: quote.quoteNumber,
                status: quote.status,
                customerName: customer.name,
              })
              .from(quote)
              .innerJoin(customer, eq(customer.id, quote.customerId))
              .where(
                isNumericQuery
                  ? sql`${quote.quoteNumber}::text ILIKE ${pattern}`
                  : or(
                      sql`${quote.quoteNumber}::text ILIKE ${pattern}`,
                      ilike(customer.name, pattern),
                      ilike(customer.phone, pattern),
                      ilike(customer.email, pattern),
                    ),
              )
              .orderBy(desc(quote.createdAt))
              .limit(filter === "quote" ? 20 : 5)
          : emptyQuotes,

        filter === "all" || filter === "invoice"
          ? db
              .select({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
                customerName: customer.name,
              })
              .from(invoice)
              .innerJoin(customer, eq(customer.id, invoice.customerId))
              .where(
                isNumericQuery
                  ? sql`${invoice.invoiceNumber}::text ILIKE ${pattern}`
                  : or(
                      sql`${invoice.invoiceNumber}::text ILIKE ${pattern}`,
                      ilike(customer.name, pattern),
                      ilike(customer.phone, pattern),
                      ilike(customer.email, pattern),
                    ),
              )
              .orderBy(desc(invoice.createdAt))
              .limit(filter === "invoice" ? 20 : 5)
          : emptyInvoices,

        filter === "all" && !isNumericQuery
          ? db
              .select({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
              })
              .from(user)
              .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
              .orderBy(desc(user.createdAt))
              .limit(5)
          : emptyEmployees,
      ]);

      return { customers, quotes, invoices, employees };
    }),
};
