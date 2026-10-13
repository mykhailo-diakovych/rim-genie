import { Effect } from "effect";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { db } from "@rim-genie/db";
import {
  customer,
  quote,
  quoteItem,
  termsSignature,
  invoice,
  loyaltyConfig,
  payment,
  job,
  jobType,
  service,
  serviceTypeEnum,
  serviceCategoryEnum,
  quoteVehicleTypeEnum,
  rimMaterialEnum,
  brakeUnitEnum,
  powderCoatScopeEnum,
} from "@rim-genie/db/schema";
import type { JobTypeEntry } from "@rim-genie/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  adminProcedure,
  floorManagerProcedure,
  priceAdjustProcedure,
  protectedProcedure,
  requireRole,
} from "../index";
import * as DiscountService from "../services/discount.service";
import * as InvoiceService from "../services/invoice.service";
import * as EmailService from "../services/email.service";
import * as SmsService from "../services/sms.service";
import {
  CustomerHasNoEmail,
  CustomerHasNoPhone,
  CustomerHasInvoices,
  CustomerHasJobs,
  PriceNotFound,
  QuoteNotFound,
  UnknownJobType,
} from "../services/errors";
import { runEffect } from "../services/run-effect";
import {
  computeItemPrice,
  getPricingConfig,
  lookupPrice,
  lookupRimPrice,
} from "../services/pricing.service";
import { recalcQuoteTotal } from "../services/quote.service";
import { getQuotePdf } from "../pdf/get-quote-pdf";
import { createQuoteEmail } from "../emails/quote-email";

async function quoteDiscountAmount(quoteId: string): Promise<number> {
  const [row] = await db
    .select({ discountAmount: quote.discountAmount })
    .from(quote)
    .where(eq(quote.id, quoteId));
  return row?.discountAmount ?? 0;
}

type ItemPriceParams = Parameters<typeof computeItemPrice>[0];

// Catalog keys a line's job types are checked against: rim options, tire services and
// brake services live in `job_type`; welding materials and powder coating do not.
function catalogKeys(params: ItemPriceParams): string[] {
  if (params.itemType === "rim") return params.jobTypes.map((jt) => jt.type);
  if (params.itemType === "general") {
    return params.jobTypes.map((jt) => (jt.unit ? jt.type : (jt.subType ?? jt.type)));
  }
  return [];
}

async function assertActiveJobTypes(keys: string[]) {
  if (keys.length === 0) return;
  const parent = alias(jobType, "parent");
  const rows = await db
    .select({ key: jobType.key })
    .from(jobType)
    .leftJoin(parent, eq(jobType.parentId, parent.id))
    .where(
      and(
        inArray(jobType.key, keys),
        eq(jobType.isActive, true),
        or(isNull(jobType.parentId), eq(parent.isActive, true)),
      ),
    );
  const active = new Set(rows.map((r) => r.key));
  const missing = [...new Set(keys.filter((k) => !active.has(k)))];
  if (missing.length > 0) {
    await runEffect(Effect.fail(new UnknownJobType({ reason: missing.join(", ") })));
  }
}

// A line with no catalog price would be saved at $0 and reach the cashier that way, so
// it is rejected instead: the job is not done at that size (RIM-5 item 13).
async function priceItemOrFail(params: ItemPriceParams): Promise<number> {
  const { unitCost, unpriced } = await computeItemPrice(params);
  if (unpriced.length === 0) return unitCost;

  const rows = await db
    .select({ key: jobType.key, label: jobType.label })
    .from(jobType)
    .where(inArray(jobType.key, unpriced));
  const labelByKey = new Map(rows.map((r) => [r.key, r.label]));
  const labels = [...new Set(unpriced.map((k) => labelByKey.get(k) ?? k))].join(", ");
  const sized = params.itemType === "rim" || params.itemType === "powder-coating";
  const hint = sized
    ? ` for ${params.vehicleSize}" rims. Choose a different size`
    : params.tireSize
      ? ` for ${params.tireSize}" tires. Choose a different size or option`
      : ". Choose a different option";
  return runEffect(Effect.fail(new PriceNotFound({ reason: `${labels}${hint}` })));
}

// Touching any of these is a composition change, which retires a manual price.
const PRICING_INPUT_FIELDS = [
  "itemType",
  "jobTypes",
  "vehicleType",
  "rimMaterial",
  "vehicleSize",
  "inches",
  "tireSize",
  "quantity",
] as const;

const jobTypeEntrySchema = z.object({
  // Dynamic job-type key (from the catalog `job_type` table). Kept as a free
  // string so new admin-defined job types are accepted without code changes.
  type: z.string().min(1),
  input: z.string().optional(),
  workTypes: z.array(z.string()).optional(),
  rimAvailable: z.boolean().optional(),
  needsBuildUp: z.boolean().optional(),
  comments: z.string().optional(),
  subType: z.string().optional(),
  // Module-specific selections (brake / powder coating)
  unit: z.enum(brakeUnitEnum.enumValues).optional(),
  removalIncluded: z.boolean().optional(),
  scope: z.enum(powderCoatScopeEnum.enumValues).optional(),
  colorCount: z.number().int().optional(),
  colors: z.array(z.string()).optional(),
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

  pricing: {
    lookup: protectedProcedure
      .input(
        z.object({
          category: z.enum(serviceCategoryEnum.enumValues),
          jobTypes: z.array(z.string().min(1)),
          vehicleType: z.enum(quoteVehicleTypeEnum.enumValues).optional(),
          rimMaterial: z.enum(rimMaterialEnum.enumValues).optional(),
          size: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const result: Record<string, { unitCost: number; found: boolean }> = {};
        // Rim prices come back with the steel/truck modifiers applied, exactly as
        // computeItemPrice saves them, so the sheet shows the price that will be stored.
        const config = input.category === "rim" ? await getPricingConfig() : null;

        for (const jt of input.jobTypes) {
          const params = {
            jobType: jt,
            vehicleType: input.vehicleType,
            rimMaterial: input.rimMaterial,
            size: input.size,
          };
          const unitCost = config
            ? await lookupRimPrice(params, config)
            : ((await lookupPrice({ ...params, category: input.category }))?.unitCost ?? null);
          result[jt] = unitCost != null ? { unitCost, found: true } : { unitCost: 0, found: false };
        }

        return result;
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

    list: requireRole("admin", "floorManager", "cashier")
      .input(
        z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional(),
      )
      .handler(async ({ input }) => {
        const dateFilter = input?.dateFrom
          ? gte(customer.createdAt, new Date(input.dateFrom))
          : undefined;
        const dateToFilter = input?.dateTo
          ? lte(customer.createdAt, new Date(input.dateTo))
          : undefined;

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
          .where(and(isNull(customer.deletedAt), dateFilter, dateToFilter))
          .groupBy(customer.id)
          .orderBy(desc(customer.createdAt));
      }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const row = await db.query.customer.findFirst({
        where: and(eq(customer.id, input.id), isNull(customer.deletedAt)),
        with: {
          quotes: {
            orderBy: (q, { desc }) => [desc(q.createdAt)],
            with: {
              createdBy: { columns: { id: true, name: true } },
              items: {
                orderBy: (i, { asc }) => [asc(i.sortOrder)],
              },
            },
          },
          invoices: {
            orderBy: (i, { desc }) => [desc(i.createdAt)],
            with: {
              quote: { columns: { id: true }, with: { createdBy: { columns: { name: true } } } },
              payments: { columns: { amount: true } },
              jobs: {
                with: {
                  invoiceItem: true,
                  technician: { columns: { id: true, name: true } },
                  pickup: {
                    columns: { pickedUpAt: true },
                    with: { pickedUpBy: { columns: { name: true } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!row) return undefined;

      return {
        ...row,
        invoices: row.invoices.map(({ quote, payments, ...inv }) => {
          const paid = payments.reduce((sum, p) => sum + p.amount, 0);
          return {
            ...inv,
            paid,
            balance: inv.total - paid,
            // Same rule as the invoice PDF: the quote's author, not whoever converted it.
            preparedByName: quote.createdBy.name,
          };
        }),
      };
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
      .input(
        z
          .object({
            search: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
          })
          .optional(),
      )
      .handler(async ({ input, context }) => {
        const search = input?.search?.trim();
        const locId = context.locationId;

        // Match the branch recorded on the quote itself, not the creator's profile
        // location — see the note on `quote.locationId`. Unstamped legacy rows stay
        // visible everywhere rather than disappearing.
        const locationFilter = locId
          ? or(eq(quote.locationId, locId), isNull(quote.locationId))
          : undefined;

        const dateFilter = input?.dateFrom
          ? gte(quote.createdAt, new Date(input.dateFrom))
          : undefined;
        const dateToFilter = input?.dateTo
          ? lte(quote.createdAt, new Date(input.dateTo))
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
                dateFilter,
                dateToFilter,
                or(
                  sql`${invoice.invoiceNumber}::text ILIKE ${pattern}`,
                  sql`${quote.quoteNumber}::text ILIKE ${pattern}`,
                  ilike(customer.name, pattern),
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
              createdBy: { columns: { id: true, name: true } },
              items: true,
              invoice: true,
            },
          });
        }

        return db.query.quote.findMany({
          where: and(locationFilter, dateFilter, dateToFilter),
          orderBy: (q, { desc }) => [desc(q.createdAt)],
          with: {
            customer: true,
            createdBy: { columns: { id: true, name: true } },
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
          // Name only — the whole user row would put emails and roles on the wire
          // for something the UI renders as a single line of text.
          createdBy: { columns: { id: true, name: true } },
          items: {
            orderBy: (i, { asc }) => [asc(i.sortOrder)],
          },
          invoice: true,
        },
      });
    }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.string(),
          customerReason: z.string().optional(),
          fullDiagnosticConsent: z.boolean().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const cust = await db.query.customer.findFirst({
          where: eq(customer.id, input.customerId),
        });
        const vipDiscountPercent = cust?.isVip && cust?.discount ? cust.discount : 0;

        const loyaltyConf = await db.query.loyaltyConfig.findFirst({
          where: eq(loyaltyConfig.id, "singleton"),
        });
        let rewardDiscountPercent = 0;
        if (loyaltyConf) {
          const [stats] = await db
            .select({
              paidCount: sql<number>`count(*)::int`,
              totalSpent: sql<number>`coalesce(sum(${invoice.total}), 0)::int`,
            })
            .from(invoice)
            .where(sql`${invoice.customerId} = ${input.customerId} AND ${invoice.status} = 'paid'`);
          const isEligible =
            (stats?.paidCount ?? 0) >= loyaltyConf.purchaseThreshold ||
            (stats?.totalSpent ?? 0) >= loyaltyConf.spendThreshold;
          if (isEligible) {
            rewardDiscountPercent = loyaltyConf.rewardPercent;
          }
        }

        const discountPercent = vipDiscountPercent + rewardDiscountPercent;

        const rows = await db
          .insert(quote)
          .values({
            customerId: input.customerId,
            createdById: context.session.user.id,
            locationId: context.locationId,
            status: "draft",
            discountPercent,
            vipDiscountPercent,
            rewardDiscountPercent,
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
          customerReason: z.string().optional(),
          jobRack: z.string().optional(),
          discountPercent: z.number().int().min(0).max(100).optional(),
          discountType: z.enum(["percent", "fixed"]).optional(),
          discountFixedCents: z.number().int().min(0).optional(),
          fullDiagnosticConsent: z.boolean().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const { id, discountPercent, discountType, discountFixedCents, ...fields } = input;
        const isAdmin = context.session.user.role === "admin";
        const touchesDiscount =
          discountPercent !== undefined ||
          discountType !== undefined ||
          discountFixedCents !== undefined;

        // Fixed-dollar discounts skip the (percent-only) approval flow, so admin-only.
        if (!isAdmin && (discountType === "fixed" || discountFixedCents !== undefined)) {
          throw new ORPCError("FORBIDDEN", {
            message: "Fixed-dollar discounts require an admin. Request a percentage instead.",
          });
        }

        const updateFields: Record<string, unknown> = { ...fields };
        if (isAdmin) {
          if (discountPercent !== undefined) updateFields.discountPercent = discountPercent;
          if (discountType !== undefined) updateFields.discountType = discountType;
          if (discountFixedCents !== undefined)
            updateFields.discountFixedCents = discountFixedCents;
        }

        const rows = await db
          .update(quote)
          .set(updateFields as Partial<typeof quote.$inferInsert>)
          .where(eq(quote.id, id))
          .returning();

        if (touchesDiscount && isAdmin) {
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

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
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
          vehicleType: z.enum(quoteVehicleTypeEnum.enumValues).nullable().optional(),
          rimMaterial: z.enum(rimMaterialEnum.enumValues).nullable().optional(),
          quantity: z.number().int().min(1).default(1),
          unitCost: z.number().int().min(0).default(0),
          inches: z.number().int().min(1).optional(),
          tireSize: z.number().int().min(1).optional(),
          jobTypes: z.array(jobTypeEntrySchema).min(1),
          description: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const priceParams = {
          itemType: input.itemType,
          jobTypes: input.jobTypes,
          vehicleType: input.vehicleType,
          rimMaterial: input.rimMaterial,
          vehicleSize: input.vehicleSize,
          tireSize: input.tireSize,
        };
        await assertActiveJobTypes(catalogKeys(priceParams));
        const unitCost = await priceItemOrFail(priceParams);

        const existing = await db
          .select({ sortOrder: quoteItem.sortOrder })
          .from(quoteItem)
          .where(eq(quoteItem.quoteId, input.quoteId))
          .orderBy(sql`${quoteItem.sortOrder} desc`)
          .limit(1);

        const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;

        // inches is welding-only; dropped for other item types to avoid a silent price multiply.
        const inches = input.itemType === "welding" ? (input.inches ?? null) : null;

        const rows = await db
          .insert(quoteItem)
          .values({
            quoteId: input.quoteId,
            itemType: input.itemType,
            vehicleSize: input.vehicleSize,
            sideOfVehicle: input.sideOfVehicle,
            damageLevel: input.damageLevel,
            vehicleType: input.vehicleType ?? null,
            rimMaterial: input.rimMaterial ?? null,
            quantity: input.quantity,
            unitCost,
            inches,
            tireSize: input.tireSize ?? null,
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
          vehicleType: z.enum(quoteVehicleTypeEnum.enumValues).nullable().optional(),
          rimMaterial: z.enum(rimMaterialEnum.enumValues).nullable().optional(),
          quantity: z.number().int().min(1).optional(),
          unitCost: z.number().int().min(0).optional(),
          inches: z.number().int().min(1).nullable().optional(),
          tireSize: z.number().int().min(1).nullable().optional(),
          jobTypes: z.array(jobTypeEntrySchema).optional(),
          description: z.string().optional(),
          comments: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...fields } = input;

        const existing = await db.select().from(quoteItem).where(eq(quoteItem.id, id));

        const current = existing[0];
        if (!current) {
          throw new ORPCError("NOT_FOUND", { message: "Quote item not found" });
        }

        const mergedItemType = fields.itemType ?? current.itemType;
        const mergedJobTypes = fields.jobTypes ?? current.jobTypes;
        const mergedVehicleType =
          fields.vehicleType !== undefined ? fields.vehicleType : current.vehicleType;
        const mergedRimMaterial =
          fields.rimMaterial !== undefined ? fields.rimMaterial : current.rimMaterial;
        const mergedVehicleSize = fields.vehicleSize ?? current.vehicleSize;
        const rawInches = fields.inches !== undefined ? fields.inches : current.inches;
        // inches is welding-only (see addItem).
        const mergedInches = mergedItemType === "welding" ? rawInches : null;
        const mergedTireSize =
          fields.tireSize !== undefined ? fields.tireSize : (current.tireSize ?? null);

        const priceParams = {
          itemType: mergedItemType,
          jobTypes: mergedJobTypes,
          vehicleType: mergedVehicleType,
          rimMaterial: mergedRimMaterial,
          vehicleSize: mergedVehicleSize,
          tireSize: mergedTireSize,
        };

        // A composition change (see PRICING_INPUT_FIELDS) retires a manual price and must
        // land on a priced combination; other edits leave a legacy line's price alone.
        const compositionChanged = PRICING_INPUT_FIELDS.some(
          (field) => fields[field] !== undefined,
        );
        const keepOverride = current.priceOverridden && !compositionChanged;

        let computedPrice: number | null = null;
        if (compositionChanged) {
          if (fields.jobTypes) await assertActiveJobTypes(catalogKeys(priceParams));
          computedPrice = await priceItemOrFail(priceParams);
        } else {
          const computed = await computeItemPrice(priceParams);
          if (computed.unpriced.length === 0) computedPrice = computed.unitCost;
        }

        const updateFields = { ...fields } as Partial<typeof quoteItem.$inferInsert>;
        updateFields.inches = mergedInches;
        updateFields.tireSize = mergedTireSize;
        delete updateFields.unitCost;

        if (!keepOverride) {
          updateFields.priceOverridden = false;
          if (computedPrice != null) {
            updateFields.unitCost = computedPrice;
          }
        }

        const rows = await db
          .update(quoteItem)
          .set(updateFields)
          .where(eq(quoteItem.id, id))
          .returning();

        const prevDiscount = await quoteDiscountAmount(current.quoteId);
        await recalcQuoteTotal(current.quoteId);

        const updated = rows[0]!;
        if (
          updated.unitCost !== current.unitCost ||
          updated.priceOverridden !== current.priceOverridden
        ) {
          await InvoiceService.mirrorQuoteItemPrice(
            updated.id,
            updated.unitCost,
            updated.priceOverridden,
            prevDiscount,
          );
        }

        return updated;
      }),

    // Hand-typed whole-line total in cents; gated server-side, not just in the UI.
    setItemPrice: priceAdjustProcedure
      .input(
        z.object({
          itemId: z.string(),
          totalCents: z.number().int().min(0).max(100_000_000),
        }),
      )
      .handler(async ({ input }) => {
        const existing = await db
          .select()
          .from(quoteItem)
          .where(eq(quoteItem.id, input.itemId))
          .limit(1);

        const current = existing[0];
        if (!current) {
          throw new ORPCError("NOT_FOUND", { message: "Quote item not found" });
        }

        const quantity = current.quantity > 0 ? current.quantity : 1;
        const unitCost = Math.round(input.totalCents / quantity);

        const rows = await db
          .update(quoteItem)
          .set({ unitCost, priceOverridden: true })
          .where(eq(quoteItem.id, input.itemId))
          .returning();

        const prevDiscount = await quoteDiscountAmount(current.quoteId);
        await recalcQuoteTotal(current.quoteId);
        await InvoiceService.mirrorQuoteItemPrice(input.itemId, unitCost, true, prevDiscount);

        return rows[0]!;
      }),

    clearItemPrice: priceAdjustProcedure
      .input(z.object({ itemId: z.string() }))
      .handler(async ({ input }) => {
        const existing = await db
          .select()
          .from(quoteItem)
          .where(eq(quoteItem.id, input.itemId))
          .limit(1);

        const current = existing[0];
        if (!current) {
          throw new ORPCError("NOT_FOUND", { message: "Quote item not found" });
        }

        const computedPrice = await priceItemOrFail({
          itemType: current.itemType,
          jobTypes: current.jobTypes,
          vehicleType: current.vehicleType,
          rimMaterial: current.rimMaterial,
          vehicleSize: current.vehicleSize,
          tireSize: current.tireSize,
        });

        const rows = await db
          .update(quoteItem)
          .set({ priceOverridden: false, unitCost: computedPrice })
          .where(eq(quoteItem.id, input.itemId))
          .returning();

        const prevDiscount = await quoteDiscountAmount(current.quoteId);
        await recalcQuoteTotal(current.quoteId);

        const updated = rows[0]!;
        await InvoiceService.mirrorQuoteItemPrice(
          updated.id,
          updated.unitCost,
          false,
          prevDiscount,
        );

        return updated;
      }),

    removeItem: protectedProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const existing = await db.select().from(quoteItem).where(eq(quoteItem.id, input.id));

        const item = existing[0];
        if (!item) return { success: true as const };

        await db.delete(quoteItem).where(eq(quoteItem.id, input.id));
        await recalcQuoteTotal(item.quoteId);

        return { success: true as const };
      }),

    // Moves a line between "Services to Be Conducted" and "Services Excluded". The row itself
    // never moves tables, so jobTypes, quantity, sizes and comments all survive the round trip.
    setItemExcluded: protectedProcedure
      .input(z.object({ id: z.string(), excluded: z.boolean() }))
      .handler(async ({ input }) => {
        const rows = await db
          .update(quoteItem)
          .set({ isExcluded: input.excluded })
          .where(eq(quoteItem.id, input.id))
          .returning();

        const item = rows[0];
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Quote item not found" });

        await recalcQuoteTotal(item.quoteId);

        return item;
      }),

    send: floorManagerProcedure
      // `channel` lets the sender override the customer's stored preference — e.g.
      // their preferred channel has no address on file. Omitted, the preference wins.
      .input(z.object({ quoteId: z.string(), channel: z.enum(["email", "sms"]).optional() }))
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
            const channel =
              input.channel ?? (cust?.communicationPreference === "email" ? "email" : "sms");

            if (channel === "email") {
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
                text: `Hi ${cust.name}, your Rim Genie quote ${quoteRow.quoteNumber} is ready. Total: JMD ${(quoteRow.total / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
              });
            }

            return { success: true as const };
          }),
        );
      }),

    sendToCashier: floorManagerProcedure
      .input(z.object({ quoteId: z.string() }))
      .handler(async ({ input, context }) => {
        const sig = await db.query.termsSignature.findFirst({
          where: eq(termsSignature.quoteId, input.quoteId),
        });
        if (!sig) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: "Disclaimer must be signed before sending to cashier",
          });
        }
        return runEffect(InvoiceService.createFromQuote(input.quoteId, context.session.user.id));
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
