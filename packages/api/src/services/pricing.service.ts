import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { servicePrice } from "@rim-genie/db/schema";
import type { ServiceCategory, QuoteVehicleType, RimMaterial } from "@rim-genie/db/schema";

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
  inches?: number | null;
}

export async function computeItemPrice(params: ComputeItemPriceParams): Promise<number> {
  const category = ITEM_TYPE_TO_CATEGORY[params.itemType];
  if (!category) return 0;

  const size = params.vehicleSize ? parseInt(params.vehicleSize, 10) || null : null;

  if (category === "rim") {
    let total = 0;
    for (const jt of params.jobTypes) {
      const price = await lookupPrice({
        category,
        jobType: jt.type,
        vehicleType: (params.vehicleType as QuoteVehicleType) ?? null,
        rimMaterial: (params.rimMaterial as RimMaterial) ?? null,
        size,
      });
      if (price != null) total += price;
    }
    return total;
  }

  if (category === "welding") {
    const materialJobType = params.jobTypes[0]?.subType?.toLowerCase().replace(/\s+/g, "-");
    if (!materialJobType) return 0;
    const price = await lookupPrice({ category, jobType: materialJobType });
    return price ?? 0;
  }

  if (category === "powder_coating") {
    const price = await lookupPrice({ category, jobType: "powder-coating", size });
    return price ?? 0;
  }

  if (category === "general") {
    let total = 0;
    for (const jt of params.jobTypes) {
      const serviceKey = jt.subType ?? jt.type;
      const qty = jt.input ? parseInt(jt.input, 10) || 1 : 1;
      const price = await lookupPrice({ category, jobType: serviceKey });
      if (price != null) total += price * qty;
    }
    return total;
  }

  return 0;
}
