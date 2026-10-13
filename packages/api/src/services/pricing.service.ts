import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@rim-genie/db";
import {
  servicePrice,
  pricingConfig,
  brakeServicePrice,
  powderCoatPrice,
  spotPolishPrice,
  vehicleSize,
} from "@rim-genie/db/schema";
import type {
  ServiceCategory,
  QuoteVehicleType,
  RimMaterial,
  BrakeUnit,
  PowderCoatScope,
  SpotPolishSize,
} from "@rim-genie/db/schema";

interface PriceLookupParams {
  category: ServiceCategory;
  jobType: string;
  vehicleType?: QuoteVehicleType | null;
  rimMaterial?: RimMaterial | null;
  size?: number | null;
}

export interface PriceMatch {
  unitCost: number;
  vehicleSpecific: boolean;
  materialSpecific: boolean;
}

export async function lookupPrice(params: PriceLookupParams): Promise<PriceMatch | null> {
  const { size } = params;
  const conditions = [
    eq(servicePrice.category, params.category),
    eq(servicePrice.jobType, params.jobType),
    params.vehicleType
      ? or(isNull(servicePrice.vehicleType), eq(servicePrice.vehicleType, params.vehicleType))
      : isNull(servicePrice.vehicleType),
    params.rimMaterial
      ? or(isNull(servicePrice.rimMaterial), eq(servicePrice.rimMaterial, params.rimMaterial))
      : isNull(servicePrice.rimMaterial),
    ...(size != null
      ? [
          or(isNull(servicePrice.minSize), lte(servicePrice.minSize, size)),
          or(isNull(servicePrice.maxSize), gte(servicePrice.maxSize, size)),
        ]
      : [isNull(servicePrice.minSize), isNull(servicePrice.maxSize)]),
  ];

  const rows = await db
    .select({
      unitCost: servicePrice.unitCost,
      vehicleType: servicePrice.vehicleType,
      rimMaterial: servicePrice.rimMaterial,
    })
    .from(servicePrice)
    .where(and(...conditions))
    .orderBy(
      sql`${servicePrice.vehicleType} is null`,
      sql`${servicePrice.rimMaterial} is null`,
      sql`coalesce(${servicePrice.maxSize}, 2147483647) - coalesce(${servicePrice.minSize}, 0)`,
      desc(servicePrice.updatedAt),
      asc(servicePrice.id),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    unitCost: row.unitCost,
    vehicleSpecific: row.vehicleType != null,
    materialSpecific: row.rimMaterial != null,
  };
}

// ─── Config-driven rim modifiers (steel discount %, truck markup %) ─────────

export interface PricingConfigValues {
  steelDiscountPercent: number;
  truckMarkupPercent: number;
}

export async function getPricingConfig(): Promise<PricingConfigValues> {
  const [row] = await db
    .select()
    .from(pricingConfig)
    .where(eq(pricingConfig.id, "singleton"))
    .limit(1);
  return {
    steelDiscountPercent: row?.steelDiscountPercent ?? 20,
    truckMarkupPercent: row?.truckMarkupPercent ?? 20,
  };
}

// Aluminum is the base rate. Steel gets a discount; trucks get a surcharge.
// Both apply against the base; combined, they compound. A price row set
// specifically for trucks or for steel is final, so its modifier is skipped.
export function applyRimModifiers(
  match: PriceMatch,
  opts: {
    vehicleType?: QuoteVehicleType | null;
    rimMaterial?: RimMaterial | null;
  } & PricingConfigValues,
): number {
  let price = match.unitCost;
  if (opts.rimMaterial === "steel" && !match.materialSpecific) {
    price = Math.round((price * (100 - opts.steelDiscountPercent)) / 100);
  }
  if (opts.vehicleType === "truck" && !match.vehicleSpecific) {
    price = Math.round((price * (100 + opts.truckMarkupPercent)) / 100);
  }
  return price;
}

export async function lookupRimPrice(
  params: Omit<PriceLookupParams, "category">,
  config: PricingConfigValues,
): Promise<number | null> {
  const match = await lookupPrice({ ...params, category: "rim" });
  return match ? applyRimModifiers(match, { ...params, ...config }) : null;
}

// ─── Module-specific price lookups (mirror the dedicated price tables) ──────

export async function lookupBrakePrice(params: {
  vehicleSizeName: string;
  unit: BrakeUnit;
  removalIncluded: boolean;
}): Promise<number | null> {
  const rows = await db
    .select({ unitCost: brakeServicePrice.unitCost })
    .from(brakeServicePrice)
    .leftJoin(vehicleSize, eq(brakeServicePrice.vehicleSizeId, vehicleSize.id))
    .where(
      and(
        eq(vehicleSize.name, params.vehicleSizeName),
        eq(brakeServicePrice.unit, params.unit),
        eq(brakeServicePrice.removalIncluded, params.removalIncluded),
      ),
    )
    .limit(1);
  return rows.length > 0 ? rows[0]!.unitCost : null;
}

export async function lookupPowderPrice(params: {
  size: number;
  scope: PowderCoatScope;
  colorCount: number;
}): Promise<number | null> {
  const rows = await db
    .select({ unitCost: powderCoatPrice.unitCost })
    .from(powderCoatPrice)
    .where(
      and(
        lte(powderCoatPrice.minSize, params.size),
        gte(powderCoatPrice.maxSize, params.size),
        eq(powderCoatPrice.scope, params.scope),
        eq(powderCoatPrice.colorCount, params.colorCount),
      ),
    )
    .limit(1);
  return rows.length > 0 ? rows[0]!.unitCost : null;
}

export async function lookupSpotPrice(params: {
  jobTypeKey: string;
  sizeBucket: SpotPolishSize;
}): Promise<number | null> {
  const rows = await db
    .select({ unitCost: spotPolishPrice.unitCost })
    .from(spotPolishPrice)
    .where(
      and(
        eq(spotPolishPrice.jobTypeKey, params.jobTypeKey),
        eq(spotPolishPrice.sizeBucket, params.sizeBucket),
      ),
    )
    .limit(1);
  return rows.length > 0 ? rows[0]!.unitCost : null;
}

// The two spot-polish size buckets: "20 and under" vs "21 and above".
export function spotSizeBucket(size: number): SpotPolishSize {
  return size >= 21 ? "ge21" : "le20";
}

// ─── Authoritative per-item price recompute ─────────────────────────────────

const ITEM_TYPE_TO_CATEGORY: Record<string, ServiceCategory> = {
  rim: "rim",
  welding: "welding",
  "powder-coating": "powder_coating",
  general: "general",
};

interface ComputeItemPriceJob {
  type: string;
  subType?: string;
  input?: string;
  unit?: BrakeUnit;
  removalIncluded?: boolean;
  scope?: PowderCoatScope;
  colorCount?: number;
}

interface ComputeItemPriceParams {
  itemType: string;
  jobTypes: ComputeItemPriceJob[];
  vehicleType?: QuoteVehicleType | null;
  rimMaterial?: RimMaterial | null;
  vehicleSize?: string | null;
  rimSize?: number | null;
  tireSize?: number | null;
}

export interface ComputedItemPrice {
  unitCost: number;
  // Job-type keys with no catalog price for this size/vehicle/material.
  unpriced: string[];
}

export async function computeItemPrice(params: ComputeItemPriceParams): Promise<ComputedItemPrice> {
  const category = ITEM_TYPE_TO_CATEGORY[params.itemType];
  if (!category) return { unitCost: 0, unpriced: [params.itemType] };

  const size =
    params.rimSize ?? (params.vehicleSize ? parseInt(params.vehicleSize, 10) || null : null);

  if (category === "rim") {
    const config = await getPricingConfig();
    let total = 0;
    const unpriced: string[] = [];
    for (const jt of params.jobTypes) {
      // A line can carry several occurrences of the same repair, priced per occurrence.
      const qty = jt.input ? parseInt(jt.input, 10) || 1 : 1;
      const price = await lookupRimPrice(
        {
          jobType: jt.type,
          vehicleType: params.vehicleType,
          rimMaterial: params.rimMaterial,
          size,
        },
        config,
      );
      if (price != null) {
        total += price * qty;
        continue;
      }
      // Spot polish (priced by size bucket × qty) lives in the Rims section.
      const spot =
        size != null
          ? await lookupSpotPrice({ jobTypeKey: jt.type, sizeBucket: spotSizeBucket(size) })
          : null;
      if (spot != null) total += spot * qty;
      else unpriced.push(jt.type);
    }
    return { unitCost: total, unpriced };
  }

  if (category === "welding") {
    const materialJobType = params.jobTypes[0]?.subType?.toLowerCase().replace(/\s+/g, "-");
    // Return the per-inch rate, not the line total. Every consumer multiplies by
    // `inches` (see recalcQuoteTotal and the invoice subtotal), so returning
    // perInch * inches here applied the length twice and squared the price.
    const perInch = materialJobType
      ? await lookupPrice({ category, jobType: materialJobType })
      : null;
    return perInch
      ? { unitCost: perInch.unitCost, unpriced: [] }
      : { unitCost: 0, unpriced: [materialJobType ?? "welding"] };
  }

  if (category === "powder_coating") {
    const jt = params.jobTypes[0];
    const price =
      jt && size != null && jt.scope && jt.colorCount != null
        ? await lookupPowderPrice({ size, scope: jt.scope, colorCount: jt.colorCount })
        : null;
    if (!jt || price == null) return { unitCost: 0, unpriced: [jt?.type ?? "powder-coating"] };
    // Per-set is a flat price; per-rim multiplies by the number of rims.
    const qty = jt.input ? parseInt(jt.input, 10) || 1 : 1;
    return { unitCost: jt.scope === "rim" ? price * qty : price, unpriced: [] };
  }

  // Tire/brake service pricing; neither multiplies the line by the diameter.
  const tireSize = params.tireSize ?? size;
  let total = 0;
  const unpriced: string[] = [];
  for (const jt of params.jobTypes) {
    const qty = jt.input ? parseInt(jt.input, 10) || 1 : 1;
    if (jt.unit) {
      const price = await lookupBrakePrice({
        vehicleSizeName: params.vehicleSize ?? "",
        unit: jt.unit,
        removalIncluded: !!jt.removalIncluded,
      });
      if (price != null) total += price * qty;
      else unpriced.push(jt.type);
      continue;
    }
    const serviceKey = jt.subType ?? jt.type;
    const match = await lookupPrice({ category, jobType: serviceKey, size: tireSize });
    if (match) total += match.unitCost * qty;
    else unpriced.push(serviceKey);
  }
  return { unitCost: total, unpriced };
}
