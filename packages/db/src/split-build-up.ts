import { and, count, eq, isNull } from "drizzle-orm";

import { db } from "./index";
import { jobType, servicePrice } from "./schema";


const GROUP_KEY = "build-up";
const OLD_KEY = "edge-back-edge-front-sprong-hole";
const OPTIONS = [
  { key: "build-up-edge-back", label: "Edge Back" },
  { key: "build-up-edge-front", label: "Edge Front" },
  { key: "build-up-sprong", label: "Sprong" },
  { key: "build-up-hole", label: "Hole" },
];

async function splitBuildUp() {
  await db.transaction(async (tx) => {
    const [group] = await tx
      .select({ id: jobType.id, category: jobType.category, section: jobType.section })
      .from(jobType)
      .where(and(eq(jobType.key, GROUP_KEY), isNull(jobType.parentId)))
      .limit(1);
    if (!group) {
      console.warn(`Job type group "${GROUP_KEY}" not found, nothing to do.`);
      return;
    }

    const oldPrices = await tx
      .select({
        category: servicePrice.category,
        vehicleType: servicePrice.vehicleType,
        rimMaterial: servicePrice.rimMaterial,
        minSize: servicePrice.minSize,
        maxSize: servicePrice.maxSize,
        unitCost: servicePrice.unitCost,
      })
      .from(servicePrice)
      .where(eq(servicePrice.jobType, OLD_KEY));

    for (const [i, option] of OPTIONS.entries()) {
      const inserted = await tx
        .insert(jobType)
        .values({
          category: group.category,
          section: group.section,
          parentId: group.id,
          key: option.key,
          label: option.label,
          config: {},
          sortOrder: i,
        })
        .onConflictDoNothing({ target: jobType.key })
        .returning({ id: jobType.id });
      console.log(`  ${option.key}: ${inserted.length > 0 ? "created" : "already exists"}`);

      const [existing] = await tx
        .select({ n: count() })
        .from(servicePrice)
        .where(eq(servicePrice.jobType, option.key));
      if ((existing?.n ?? 0) > 0 || oldPrices.length === 0) continue;

      await tx.insert(servicePrice).values(oldPrices.map((p) => ({ ...p, jobType: option.key })));
      console.log(`    copied ${oldPrices.length} prices from ${OLD_KEY}`);
    }

    const deactivated = await tx
      .update(jobType)
      .set({ isActive: false })
      .where(and(eq(jobType.key, OLD_KEY), eq(jobType.isActive, true)))
      .returning({ id: jobType.id });
    console.log(
      `  ${OLD_KEY}: ${deactivated.length > 0 ? "deactivated" : "already inactive or absent"}`,
    );
  });
}

splitBuildUp()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Build Up split failed:", e);
    process.exit(1);
  });
