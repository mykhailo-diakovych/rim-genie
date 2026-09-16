import type { JobTypeEntry } from "./schema/floor";

// unitCost = full line price, except welding where unitCost = per-inch rate and `inches` = weld
// length. `quantity` is a whole-line multiplier. `priceOverridden` opts a line out of all derived
// multipliers (incl. welding's per-inch rate), so a typed-in amount is exactly what bills.
export type LineItemTotalInput = {
  itemType: string;
  quantity: number;
  unitCost: number;
  inches?: number | null;
  priceOverridden?: boolean | null;
};

export function lineTotalCents(item: LineItemTotalInput): number {
  if (!item.priceOverridden && item.itemType === "welding" && item.inches) {
    return item.inches * item.unitCost * item.quantity;
  }
  return item.quantity * item.unitCost;
}

export type LineItemQuantityInput = LineItemTotalInput & {
  jobTypes?: JobTypeEntry[] | null;
};

function jobLabel(entry: JobTypeEntry): string {
  if (entry.subType) return entry.subType;
  return entry.type
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// "Qty" column: welding shows inches of weld, other items show per-job quantities.
export function lineQuantityLabel(item: LineItemQuantityInput): string {
  if (item.itemType === "welding") {
    return item.inches ? `${item.inches}"` : String(item.quantity);
  }

  const parts = (item.jobTypes ?? [])
    .map((entry) => ({ label: jobLabel(entry), qty: parseInt(entry.input ?? "", 10) }))
    .filter((part) => Number.isFinite(part.qty) && part.qty > 0);

  if (parts.length === 0) return String(item.quantity);
  if (parts.length === 1) return String(parts[0]!.qty);
  return parts.map((part) => `${part.label} x${part.qty}`).join(", ");
}
