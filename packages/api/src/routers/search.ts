import { z } from "zod";

import { db } from "@rim-genie/db";
import { customer, quote, invoice, user } from "@rim-genie/db/schema";
import { desc, eq, ilike, or, sql } from "drizzle-orm";

import { protectedProcedure } from "../index";

export const searchRouter = {
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .handler(async ({ input }) => {
      const pattern = `%${input.query}%`;

      const [customers, quotes, invoices, employees] = await Promise.all([
        db
          .select({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          })
          .from(customer)
          .where(
            or(
              ilike(customer.name, pattern),
              ilike(customer.phone, pattern),
              ilike(customer.email, pattern),
            ),
          )
          .orderBy(desc(customer.createdAt))
          .limit(5),

        db
          .select({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            customerName: customer.name,
          })
          .from(quote)
          .innerJoin(customer, eq(customer.id, quote.customerId))
          .where(
            or(sql`${quote.quoteNumber}::text ILIKE ${pattern}`, ilike(customer.name, pattern)),
          )
          .orderBy(desc(quote.createdAt))
          .limit(5),

        db
          .select({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            customerName: customer.name,
          })
          .from(invoice)
          .innerJoin(customer, eq(customer.id, invoice.customerId))
          .where(
            or(sql`${invoice.invoiceNumber}::text ILIKE ${pattern}`, ilike(customer.name, pattern)),
          )
          .orderBy(desc(invoice.createdAt))
          .limit(5),

        db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          })
          .from(user)
          .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
          .orderBy(desc(user.createdAt))
          .limit(5),
      ]);

      return { customers, quotes, invoices, employees };
    }),
};
