import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

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

export async function lookupPrice(params: PriceLookupParams): Promise<number | null> {
  const conditions = [
    eq(servicePrice.category, params.category),
    eq(servicePrice.jobType, params.jobType),
  ];

  if (params.vehicleType) {
    conditions.push(
      or(isNull(servicePrice.vehicleType), eq(servicePrice.vehicleType, params.vehicleType))!,
    );
  }
  if (params.rimMaterial) {
    conditions.push(
      or(isNull(servicePrice.rimMaterial), eq(servicePrice.rimMaterial, params.rimMaterial))!,
    );
  }
  if (params.size != null) {
    conditions.push(or(isNull(servicePrice.minSize), lte(servicePrice.minSize, params.size))!);
    conditions.push(or(isNull(servicePrice.maxSize), gte(servicePrice.maxSize, params.size))!);
  }

  const rows = await db
    .select({ unitCost: servicePrice.unitCost })
    .from(servicePrice)
    .where(and(...conditions))
    .limit(1);

  return rows.length > 0 ? rows[0]!.unitCost : null;
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
// Both apply against the base; combined, they compound.
export function applyRimModifiers(
  base: number,
  opts: { isSteel: boolean; isTruck: boolean } & PricingConfigValues,
): number {
  let price = base;
  if (opts.isSteel) {
    price = Math.round((price * (100 - opts.steelDiscountPercent)) / 100);
  }
  if (opts.isTruck) {
    price = Math.round((price * (100 + opts.truckMarkupPercent)) / 100);
  }
  return price;
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

interface ComputeItemPriceParams {
  itemType: string;
  jobTypes: { type: string; subType?: string; input?: string }[];
  vehicleType?: string | null;
  rimMaterial?: string | null;
  vehicleSize?: string | null;
  rimSize?: number | null;
  inches?: number | null;
}

export async function computeItemPrice(params: ComputeItemPriceParams): Promise<number> {
  const category = ITEM_TYPE_TO_CATEGORY[params.itemType];
  if (!category) return 0;

  const size =
    params.rimSize ?? (params.vehicleSize ? parseInt(params.vehicleSize, 10) || null : null);

  if (category === "rim") {
    const config = await getPricingConfig();
    const isSteel = params.rimMaterial === "steel";
    const isTruck = params.vehicleType === "truck";
    let total = 0;
    for (const jt of params.jobTypes) {
      const base = await lookupPrice({ category, jobType: jt.type, size });
      if (base == null) continue;
      total += applyRimModifiers(base, { isSteel, isTruck, ...config });
    }
    return total;
  }

  if (category === "welding") {
    const materialJobType = params.jobTypes[0]?.subType?.toLowerCase().replace(/\s+/g, "-");
    if (!materialJobType) return 0;
    const perInch = await lookupPrice({ category, jobType: materialJobType });
    if (perInch == null) return 0;
    return perInch * (params.inches ?? 0);
  }

  if (category === "powder_coating") {
    // Powder pricing is scope × color-count × size range (see lookupPowderPrice).
    // Wired once the item contract carries scope/colorCount (frontend phase).
    return 0;
  }

  if (category === "general") {
    let total = 0;
    for (const jt of params.jobTypes) {
      const serviceKey = jt.subType ?? jt.type;
      const qty = jt.input ? parseInt(jt.input, 10) || 1 : 1;
      const price = await lookupPrice({ category, jobType: serviceKey, size });
      if (price != null) total += price * qty;
    }
    return total;
  }

  return 0;
}
