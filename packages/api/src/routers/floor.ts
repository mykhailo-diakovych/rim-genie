import { Effect } from "effect";
import { z } from "zod";

import { db } from "@rim-genie/db";
import { env } from "@rim-genie/env/server";
import {
  customer,
  quote,
  quoteItem,
  quoteExcludedService,
  termsSignature,
  invoice,
  payment,
  job,
  service,
  serviceTypeEnum,
  user,
} from "@rim-genie/db/schema";
import type { JobTypeEntry } from "@rim-genie/db/schema";
import { and, asc, desc, eq, ilike, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

import { adminProcedure, floorManagerProcedure, protectedProcedure, requireRole } from "../index";
import * as DiscountService from "../services/discount.service";
import * as InvoiceService from "../services/invoice.service";
import * as EmailService from "../services/email.service";
import * as SmsService from "../services/sms.service";
import {
  CustomerHasNoEmail,
  CustomerHasNoPhone,
  CustomerHasInvoices,
  CustomerHasJobs,
  QuoteNotFound,
} from "../services/errors";
import { runEffect } from "../services/run-effect";
import { recalcQuoteTotal } from "../services/quote.service";
import { getQuotePdf } from "../pdf/get-quote-pdf";
import { createQuoteEmail } from "../emails/quote-email";

const jobTypeEntrySchema = z.object({
  type: z.enum([
    "bend-fix",
    "crack-fix",
    "straighten",
    "twist",
    "reconstruct",
    "sprung",
    "build-up",
    "platinum-resurfacing",
    "hand-polish",
    "polishing",
    "general",
    "welding",
    "powder-coating",
  ]),
  input: z.string().optional(),
  workTypes: z.array(z.string()).optional(),
  rimAvailable: z.boolean().optional(),
  needsBuildUp: z.boolean().optional(),
  comments: z.string().optional(),
  subType: z.string().optional(),
});

export const floorRouter = {
  services: {
    list: protectedProcedure
      .input(z.object({ type: z.enum(serviceTypeEnum.enumValues) }))
      .handler(async ({ input }) => {
        return db
          .select()
          .from(service)
          .where(eq(service.type, input.type))
          .orderBy(asc(service.name));
      }),
  },

  customers: {
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .handler(async ({ input }) => {
        return db
          .select()
          .from(customer)
          .where(
            and(
              isNull(customer.deletedAt),
              or(
                ilike(customer.phone, `%${input.query}%`),
                ilike(customer.name, `%${input.query}%`),
              ),
            ),
          )
          .orderBy(desc(customer.createdAt))
          .limit(20);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email().optional(),
          birthdayDay: z.number().int().min(1).max(31).optional(),
          birthdayMonth: z.number().int().min(1).max(12).optional(),
          isVip: z.boolean().optional(),
          discount: z.number().int().min(0).max(100).optional(),
          communicationPreference: z.enum(["sms", "email"]).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const rows = await db.insert(customer).values(input).returning();
        return rows[0]!;
      }),

    list: requireRole("admin", "floorManager", "cashier").handler(async () => {
      return db
        .select({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          birthdayDay: customer.birthdayDay,
          birthdayMonth: customer.birthdayMonth,
          isVip: customer.isVip,
          discount: customer.discount,
          quotesCount: sql<number>`count(distinct ${quote.id})::int`,
          jobsCount: sql<number>`count(${quoteItem.id})::int`,
          paidInvoiceCount: sql<number>`count(distinct ${invoice.id}) filter (where ${invoice.status} = 'paid')::int`,
          totalSpent: sql<number>`coalesce(sum(distinct case when ${invoice.status} = 'paid' then ${invoice.total} else 0 end), 0)::int`,
        })
        .from(customer)
        .leftJoin(quote, eq(quote.customerId, customer.id))
        .leftJoin(quoteItem, eq(quoteItem.quoteId, quote.id))
        .leftJoin(invoice, eq(invoice.customerId, customer.id))
        .where(isNull(customer.deletedAt))
        .groupBy(customer.id)
        .orderBy(desc(customer.createdAt));
    }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return db.query.customer.findFirst({
        where: and(eq(customer.id, input.id), isNull(customer.deletedAt)),
        with: {
          quotes: {
            orderBy: (q, { desc }) => [desc(q.createdAt)],
            with: {
              items: {
                orderBy: (i, { asc }) => [asc(i.sortOrder)],
              },
            },
          },
          invoices: {
            with: {
              jobs: {
                with: { invoiceItem: true },
              },
            },
          },
        },
      });
    }),

    update: floorManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email().optional(),
          birthdayDay: z.number().int().min(1).max(31).optional(),
          birthdayMonth: z.number().int().min(1).max(12).optional(),
          isVip: z.boolean().optional(),
          discount: z.number().int().min(0).max(100).optional(),
          communicationPreference: z.enum(["sms", "email"]).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;
        const rows = await db.update(customer).set(fields).where(eq(customer.id, id)).returning();
        return rows[0]!;
      }),

    delete: floorManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const existing = await db.query.customer.findFirst({
        where: eq(customer.id, input.id),
      });

      if (!existing) throw new Error("Customer not found");

      const [invoiceRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoice)
        .where(eq(invoice.customerId, input.id));

      if (invoiceRow && invoiceRow.count > 0) {
        return runEffect(Effect.fail(new CustomerHasInvoices({ customerId: input.id })));
      }

      const [jobRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(job)
        .innerJoin(invoice, eq(job.invoiceId, invoice.id))
        .where(eq(invoice.customerId, input.id));

      if (jobRow && jobRow.count > 0) {
        return runEffect(Effect.fail(new CustomerHasJobs({ customerId: input.id })));
      }

      await db.update(customer).set({ deletedAt: new Date() }).where(eq(customer.id, input.id));

      return { success: true as const };
    }),

    restore: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const rows = await db
        .update(customer)
        .set({ deletedAt: null })
        .where(eq(customer.id, input.id))
        .returning();
      return rows[0]!;
    }),

    deleted: adminProcedure.handler(async () => {
      return db.query.customer.findMany({
        where: and(sql`${customer.deletedAt} IS NOT NULL`),
        orderBy: [desc(customer.deletedAt)],
      });
    }),
  },

  quotes: {
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .handler(async ({ input, context }) => {
        const search = input?.search?.trim();
        const locId = context.locationId;

        const locationFilter = locId
          ? inArray(
              quote.createdById,
              db.select({ id: user.id }).from(user).where(eq(user.locationId, locId)),
            )
          : undefined;

        if (search && search.length > 0) {
          const pattern = `%${search}%`;
          const matchingQuoteIds = await db
            .selectDistinct({ id: quote.id })
            .from(quote)
            .leftJoin(invoice, eq(invoice.quoteId, quote.id))
            .innerJoin(customer, eq(customer.id, quote.customerId))
            .where(
              and(
                locationFilter,
                or(
                  sql`${invoice.invoiceNumber}::text ILIKE ${pattern}`,
                  sql`${quote.quoteNumber}::text ILIKE ${pattern}`,
                  ilike(customer.name, pattern),
                  ilike(customer.phone, pattern),
                ),
              ),
            );

          if (matchingQuoteIds.length === 0) return [];

          return db.query.quote.findMany({
            where: inArray(
              quote.id,
              matchingQuoteIds.map((r) => r.id),
            ),
            orderBy: (q, { desc }) => [desc(q.createdAt)],
            with: {
              customer: true,
              items: true,
              invoice: true,
            },
          });
        }

        return db.query.quote.findMany({
          where: locationFilter,
          orderBy: (q, { desc }) => [desc(q.createdAt)],
          with: {
            customer: true,
            items: true,
            invoice: true,
          },
        });
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return db.query.quote.findFirst({
        where: eq(quote.id, input.id),
        with: {
          customer: true,
          createdBy: true,
          items: {
            orderBy: (i, { asc }) => [asc(i.sortOrder)],
          },
          excludedServices: true,
          invoice: true,
        },
      });
    }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.string(),
          validUntilDays: z.number().int().optional(),
          customerReason: z.string().optional(),
          fullDiagnosticConsent: z.boolean().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const validUntil = new Date(Date.now() + (input.validUntilDays ?? 7) * 86_400_000);

        const cust = await db.query.customer.findFirst({
          where: eq(customer.id, input.customerId),
        });
        const discountPercent = cust?.isVip && cust?.discount ? cust.discount : 0;

        const rows = await db
          .insert(quote)
          .values({
            customerId: input.customerId,
            createdById: context.session.user.id,
            status: "draft",
            validUntil,
            discountPercent,
            customerReason: input.customerReason,
            fullDiagnosticConsent: input.fullDiagnosticConsent ?? false,
          })
          .returning();
        return rows[0]!;
      }),

    update: floorManagerProcedure
      .input(
        z.object({
          id: z.string(),
          comments: z.string().optional(),
          jobRack: z.string().optional(),
          discountPercent: z.number().int().min(0).max(100).optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const { id, discountPercent, ...fields } = input;
        const isAdmin = context.session.user.role === "admin";

        const updateFields: Record<string, unknown> = { ...fields };
        if (discountPercent !== undefined && isAdmin) {
          updateFields.discountPercent = discountPercent;
        }

        const rows = await db
          .update(quote)
          .set(updateFields as Partial<typeof quote.$inferInsert>)
          .where(eq(quote.id, id))
          .returning();

        if (discountPercent !== undefined && isAdmin) {
          await recalcQuoteTotal(id);
        }

        if (discountPercent !== undefined && !isAdmin) {
          await runEffect(
            DiscountService.requestQuoteDiscount({
              quoteId: id,
              requestedPercent: discountPercent,
              requestedById: context.session.user.id,
            }),
          );
        }

        const itemCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(quoteItem)
          .where(eq(quoteItem.quoteId, id));

        if (itemCount[0] && itemCount[0].count > 0) {
          await runEffect(InvoiceService.syncInvoiceFromQuote(id, context.session.user.id));
        }

        return rows[0]!;
      }),

    delete: floorManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const existing = await db.query.quote.findFirst({
        where: eq(quote.id, input.id),
        with: { invoice: true },
      });

      if (!existing) throw new Error("Quote not found");

      await db.transaction(async (tx) => {
        if (existing.invoice) {
          const invoiceId = existing.invoice.id;
          await tx.delete(job).where(eq(job.invoiceId, invoiceId));
          await tx.delete(payment).where(eq(payment.invoiceId, invoiceId));
          await tx.delete(invoice).where(eq(invoice.id, invoiceId));
        }
        await tx.delete(quoteItem).where(eq(quoteItem.quoteId, input.id));
        await tx.delete(quote).where(eq(quote.id, input.id));
      });

      return { success: true as const };
    }),

    addItem: protectedProcedure
      .input(
        z.object({
          quoteId: z.string(),
          itemType: z.enum(["rim", "welding", "powder-coating", "general"]).default("rim"),
          vehicleSize: z.string().optional(),
          sideOfVehicle: z.string().optional(),
          damageLevel: z.string().optional(),
          quantity: z.number().int().min(1).default(1),
          unitCost: z.number().int().min(0).default(0),
          inches: z.number().int().min(1).optional(),
          jobTypes: z.array(jobTypeEntrySchema).default([]),
          description: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const existing = await db
          .select({ sortOrder: quoteItem.sortOrder })
          .from(quoteItem)
          .where(eq(quoteItem.quoteId, input.quoteId))
          .orderBy(sql`${quoteItem.sortOrder} desc`)
          .limit(1);

        const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;

        const rows = await db
          .insert(quoteItem)
          .values({
            quoteId: input.quoteId,
            itemType: input.itemType,
            vehicleSize: input.vehicleSize,
            sideOfVehicle: input.sideOfVehicle,
            damageLevel: input.damageLevel,
            quantity: input.quantity,
            unitCost: input.unitCost,
            inches: input.inches,
            jobTypes: input.jobTypes as JobTypeEntry[],
            description: input.description,
            sortOrder,
          })
          .returning();

        await recalcQuoteTotal(input.quoteId);
        return rows[0]!;
      }),

    updateItem: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          itemType: z.enum(["rim", "welding", "powder-coating", "general"]).optional(),
          vehicleSize: z.string().optional(),
          sideOfVehicle: z.string().optional(),
          damageLevel: z.string().optional(),
          quantity: z.number().int().min(1).optional(),
          unitCost: z.number().int().min(0).optional(),
          inches: z.number().int().min(1).nullable().optional(),
          jobTypes: z.array(jobTypeEntrySchema).optional(),
          description: z.string().optional(),
          comments: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;

        const existing = await db
          .select({ quoteId: quoteItem.quoteId })
          .from(quoteItem)
          .where(eq(quoteItem.id, id));

        const rows = await db
          .update(quoteItem)
          .set(fields as Partial<typeof quoteItem.$inferInsert>)
          .where(eq(quoteItem.id, id))
          .returning();

        const qId = existing[0]?.quoteId;
        if (qId) {
          await recalcQuoteTotal(qId);
        }

        return rows[0]!;
      }),

    removeItem: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const existing = await db
          .select({ quoteId: quoteItem.quoteId })
          .from(quoteItem)
          .where(eq(quoteItem.id, input.id));

        await db.delete(quoteItem).where(eq(quoteItem.id, input.id));

        const qId = existing[0]?.quoteId;
        if (qId) {
          await recalcQuoteTotal(qId);
        }

        return { success: true as const };
      }),

    addExcludedService: protectedProcedure
      .input(
        z.object({
          quoteId: z.string(),
          name: z.string().min(1),
          price: z.number().int().min(0).default(0),
          serviceId: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const rows = await db
          .insert(quoteExcludedService)
          .values({
            quoteId: input.quoteId,
            name: input.name,
            price: input.price,
            serviceId: input.serviceId,
          })
          .returning();
        return rows[0]!;
      }),

    removeExcludedService: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        await db.delete(quoteExcludedService).where(eq(quoteExcludedService.id, input.id));
        return { success: true as const };
      }),

    promoteExcludedService: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const excluded = await db
          .select()
          .from(quoteExcludedService)
          .where(eq(quoteExcludedService.id, input.id));

        if (!excluded[0]) throw new Error("Excluded service not found");

        const svc = excluded[0];

        let itemType: string = "rim";
        if (svc.serviceId) {
          const linkedService = await db
            .select({ type: service.type })
            .from(service)
            .where(eq(service.id, svc.serviceId))
            .limit(1);
          if (linkedService[0]) {
            itemType = linkedService[0].type;
          }
        }

        const existing = await db
          .select({ sortOrder: quoteItem.sortOrder })
          .from(quoteItem)
          .where(eq(quoteItem.quoteId, svc.quoteId))
          .orderBy(sql`${quoteItem.sortOrder} desc`)
          .limit(1);

        const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;

        await db.insert(quoteItem).values({
          quoteId: svc.quoteId,
          itemType,
          description: svc.name,
          unitCost: svc.price,
          quantity: 1,
          sortOrder,
        });

        await db.delete(quoteExcludedService).where(eq(quoteExcludedService.id, input.id));
        await recalcQuoteTotal(svc.quoteId);

        return { success: true as const };
      }),

    availableServicesForExclusion: protectedProcedure
      .input(z.object({ quoteId: z.string() }))
      .handler(async ({ input }) => {
        const alreadyExcluded = await db
          .select({ serviceId: quoteExcludedService.serviceId })
          .from(quoteExcludedService)
          .where(
            and(
              eq(quoteExcludedService.quoteId, input.quoteId),
              sql`${quoteExcludedService.serviceId} IS NOT NULL`,
            ),
          );

        const excludedIds = alreadyExcluded
          .map((r) => r.serviceId)
          .filter((id): id is string => id !== null);

        if (excludedIds.length > 0) {
          return db
            .select()
            .from(service)
            .where(notInArray(service.id, excludedIds))
            .orderBy(asc(service.name));
        }

        return db.select().from(service).orderBy(asc(service.name));
      }),

    addExcludedServicesFromCatalog: protectedProcedure
      .input(
        z.object({
          quoteId: z.string(),
          serviceIds: z.array(z.string()).min(1),
        }),
      )
      .handler(async ({ input }) => {
        const services = await db
          .select()
          .from(service)
          .where(inArray(service.id, input.serviceIds));

        if (services.length === 0) throw new Error("No services found");

        const rows = await db
          .insert(quoteExcludedService)
          .values(
            services.map((s) => ({
              quoteId: input.quoteId,
              serviceId: s.id,
              name: s.name,
              price: s.unitCost,
            })),
          )
          .returning();

        return rows;
      }),

    send: floorManagerProcedure
      .input(z.object({ quoteId: z.string() }))
      .handler(async ({ input }) => {
        return runEffect(
          Effect.gen(function* () {
            const quoteRow = yield* Effect.tryPromise(() =>
              db.query.quote.findFirst({
                where: eq(quote.id, input.quoteId),
                with: { customer: true },
              }),
            );

            if (!quoteRow) return yield* Effect.fail(new QuoteNotFound({ id: input.quoteId }));

            const cust = quoteRow.customer;
            const pref = cust?.communicationPreference ?? "sms";

            if (pref === "email") {
              if (!cust?.email) {
                return yield* Effect.fail(
                  new CustomerHasNoEmail({ customerId: quoteRow.customerId }),
                );
              }

              const pdf = yield* Effect.tryPromise(() => getQuotePdf(input.quoteId));
              const attachments = pdf
                ? [{ filename: `quote-${pdf.quoteNumber}.pdf`, content: pdf.buffer }]
                : undefined;

              yield* EmailService.send({
                to: cust.email,
                subject: `Your Rim Genie Quote #${quoteRow.quoteNumber}`,
                react: createQuoteEmail({
                  baseUrl: env.BETTER_AUTH_URL,
                  customerName: cust.name,
                  quoteNumber: quoteRow.quoteNumber,
                  subtotal: quoteRow.subtotal,
                  discountPercent: quoteRow.discountPercent,
                  discountAmount: quoteRow.discountAmount,
                  total: quoteRow.total,
                  hasAttachment: !!pdf,
                }),
                attachments,
              });
            } else {
              if (!cust?.phone) {
                return yield* Effect.fail(
                  new CustomerHasNoPhone({ customerId: quoteRow.customerId }),
                );
              }

              yield* SmsService.send({
                to: cust.phone,
                text: `Hi ${cust.name}, your Rim Genie quote ${quoteRow.quoteNumber} is ready. Total: JMD ${(quoteRow.total / 100).toFixed(2)}.`,
              });
            }

            return { success: true as const };
          }),
        );
      }),
  },

  termsSignature: {
    sign: protectedProcedure
      .input(
        z.object({
          quoteId: z.string(),
          signatureDataUrl: z.string().min(1),
        }),
      )
      .handler(async ({ input, context }) => {
        const existing = await db.query.quote.findFirst({
          where: eq(quote.id, input.quoteId),
        });
        if (!existing) throw new Error("Quote not found");

        const duplicate = await db
          .select({ id: termsSignature.id })
          .from(termsSignature)
          .where(eq(termsSignature.quoteId, input.quoteId))
          .limit(1);
        if (duplicate.length > 0) throw new Error("Terms already signed for this quote");

        const rows = await db
          .insert(termsSignature)
          .values({
            quoteId: input.quoteId,
            signatureDataUrl: input.signatureDataUrl,
            signedById: context.session.user.id,
          })
          .returning();
        return rows[0]!;
      }),

    getByQuoteId: protectedProcedure
      .input(z.object({ quoteId: z.string() }))
      .handler(async ({ input }) => {
        const row = await db.query.termsSignature.findFirst({
          where: eq(termsSignature.quoteId, input.quoteId),
        });
        return row ?? null;
      }),
  },
};
