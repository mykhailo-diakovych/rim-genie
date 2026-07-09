import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { and, inArray, isNull } from "drizzle-orm";

import { db } from "./index";
import {
  jobType,
  jobTypeExclusion,
  pricingConfig,
  vehicleSize,
  powderCoatColor,
  brakeServicePrice,
  powderCoatPrice,
  spotPolishPrice,
  servicePrice,
} from "./schema";
import type {
  BrakeUnit,
  JobTypeSection,
  PowderCoatScope,
  ServiceCategory,
  SpotPolishSize,
} from "./schema";

type PriceList = {
  jobTypeGroups: {
    tab: string;
    section: JobTypeSection;
    groupKey: string;
    label: string;
    isGeneric: boolean;
    subTypes: { key: string; label: string }[];
  }[];
  rimServicePrices: {
    category: "rim" | "general";
    section: string;
    jobType: string;
    rimSize: number;
    unitCostCents: number;
  }[];
  brakeServicePrices: {
    vehicleSizeKey: string;
    unit: BrakeUnit;
    removalIncluded: boolean;
    unitCostCents: number;
  }[];
  vehicleSizes: { name: string; key: string; sortOrder: number }[];
  weldingPrices: { key: string; perInchCents: number }[];
  powderCoatPrices: {
    minSize: number;
    maxSize: number;
    scope: PowderCoatScope;
    colorCount: number;
    unitCostCents: number;
  }[];
  powderCoatColors: { name: string; key: string; sortOrder: number }[];
  spotPolishPrices: { typeKey: string; sizeBucket: SpotPolishSize; unitCostCents: number }[];
};

const SECTION_TO_CATEGORY: Record<JobTypeSection, ServiceCategory> = {
  rims: "rim",
  "tire-service": "general",
  "brake-service": "general",
  "other-welding": "welding",
  "powder-coating": "powder_coating",
  "spot-polish": "rim",
};

// Normalize typos carried over from the source spreadsheet headers. Applied
// consistently to every place a key is used so job types and prices stay matched.
const KEY_FIXES: Record<string, string> = {
  "reconstructiion-burst-half": "reconstruction-burst-half",
};
const fixKey = (k: string) => KEY_FIXES[k] ?? k;

// Mutually-exclusive job-type pairs (RIM-3 K1). Kept idempotent and run on every
// seed — including already-seeded databases — so the rule is guaranteed to exist.
const EXCLUSION_PAIRS: [string, string][] = [["platinum-resurfacing", "spot-polish"]];

async function ensureExclusions() {
  for (const [keyA, keyB] of EXCLUSION_PAIRS) {
    const rows = await db
      .select({ id: jobType.id, key: jobType.key })
      .from(jobType)
      .where(and(inArray(jobType.key, [keyA, keyB]), isNull(jobType.parentId)));
    const idByKey = new Map(rows.map((r) => [r.key, r.id]));
    const a = idByKey.get(keyA);
    const b = idByKey.get(keyB);
    if (!a || !b) {
      console.warn(`  exclusion skipped — job types not found: ${keyA} / ${keyB}`);
      continue;
    }
    // Normalize order so the unique index treats mirrored pairs as one.
    const [jobTypeAId, jobTypeBId] = [a, b].sort();
    await db
      .insert(jobTypeExclusion)
      .values({ jobTypeAId: jobTypeAId!, jobTypeBId: jobTypeBId! })
      .onConflictDoNothing({
        target: [jobTypeExclusion.jobTypeAId, jobTypeExclusion.jobTypeBId],
      });
  }
}

async function seedCatalog() {
  const existing = await db.select({ id: jobType.id }).from(jobType).limit(1);
  if (existing.length > 0) {
    console.log("Catalog already seeded (job_type is non-empty), skipping bulk insert.");
    await ensureExclusions();
    console.log("Ensured mutual-exclusivity rules.");
    return;
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const data = JSON.parse(
    readFileSync(join(here, "../../../docs/rim-genie-price-list.json"), "utf8"),
  ) as PriceList;

  // 1. Pricing config (steel discount % + truck markup %)
  await db
    .insert(pricingConfig)
    .values({ id: "singleton", steelDiscountPercent: 20, truckMarkupPercent: 20 })
    .onConflictDoUpdate({
      target: pricingConfig.id,
      set: { steelDiscountPercent: 20, truckMarkupPercent: 20 },
    });

  // 2. Vehicle sizes → key→id map (needed by brake prices)
  const vsRows = await db
    .insert(vehicleSize)
    .values(data.vehicleSizes.map((v) => ({ name: v.name, key: v.key, sortOrder: v.sortOrder })))
    .returning({ id: vehicleSize.id, key: vehicleSize.key });
  const vsIdByKey = new Map(vsRows.map((r) => [r.key, r.id]));

  // 3. Powder-coat colors
  await db
    .insert(powderCoatColor)
    .values(
      data.powderCoatColors.map((c) => ({ name: c.name, key: c.key, sortOrder: c.sortOrder })),
    );

  // 4. Job types — groups with their sub-types, generics standalone
  const sectionOrder = new Map<JobTypeSection, number>();
  let jobTypeCount = 0;
  for (const group of data.jobTypeGroups) {
    const category = SECTION_TO_CATEGORY[group.section];
    const order = sectionOrder.get(group.section) ?? 0;
    sectionOrder.set(group.section, order + 1);

    if (group.isGeneric) {
      await db.insert(jobType).values({
        category,
        section: group.section,
        key: fixKey(group.groupKey),
        label: group.label,
        config: {},
        sortOrder: order,
      });
      jobTypeCount += 1;
      continue;
    }

    const [parent] = await db
      .insert(jobType)
      .values({
        category,
        section: group.section,
        key: fixKey(group.groupKey),
        label: group.label,
        config: { hasSubType: true },
        sortOrder: order,
      })
      .returning({ id: jobType.id });
    jobTypeCount += 1;

    if (group.subTypes.length > 0) {
      await db.insert(jobType).values(
        group.subTypes.map((s, i) => ({
          category,
          section: group.section,
          parentId: parent!.id,
          key: fixKey(s.key),
          label: s.label,
          config: {},
          sortOrder: i,
        })),
      );
      jobTypeCount += group.subTypes.length;
    }
  }

  // 5. servicePrice — rim + tire (discrete rim size → min == max) and welding (per-inch)
  const rimTireRows = data.rimServicePrices.map((p) => ({
    category: p.category,
    jobType: fixKey(p.jobType),
    minSize: p.rimSize,
    maxSize: p.rimSize,
    unitCost: p.unitCostCents,
  }));
  const weldingRows = data.weldingPrices.map((w) => ({
    category: "welding" as const,
    jobType: w.key,
    unitCost: w.perInchCents,
  }));
  await db.insert(servicePrice).values([...rimTireRows, ...weldingRows]);

  // 6. Brake / skimming prices
  await db.insert(brakeServicePrice).values(
    data.brakeServicePrices.map((b) => ({
      vehicleSizeId: vsIdByKey.get(b.vehicleSizeKey)!,
      unit: b.unit,
      removalIncluded: b.removalIncluded,
      unitCost: b.unitCostCents,
    })),
  );

  // 7. Powder-coat prices
  await db.insert(powderCoatPrice).values(
    data.powderCoatPrices.map((p) => ({
      minSize: p.minSize,
      maxSize: p.maxSize,
      scope: p.scope,
      colorCount: p.colorCount,
      unitCost: p.unitCostCents,
    })),
  );

  // 8. Spot-polish prices
  await db.insert(spotPolishPrice).values(
    data.spotPolishPrices.map((s) => ({
      jobTypeKey: fixKey(s.typeKey),
      sizeBucket: s.sizeBucket,
      unitCost: s.unitCostCents,
    })),
  );

  // 9. Mutual-exclusivity rules
  await ensureExclusions();

  console.log("Catalog seed complete:");
  console.log(`  job types:          ${jobTypeCount}`);
  console.log(`  vehicle sizes:      ${data.vehicleSizes.length}`);
  console.log(`  powder-coat colors: ${data.powderCoatColors.length}`);
  console.log(
    `  service prices:     ${rimTireRows.length + weldingRows.length} (rim/tire + welding)`,
  );
  console.log(`  brake prices:       ${data.brakeServicePrices.length}`);
  console.log(`  powder prices:      ${data.powderCoatPrices.length}`);
  console.log(`  spot prices:        ${data.spotPolishPrices.length}`);
}

seedCatalog()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Catalog seed failed:", e);
    process.exit(1);
  });
