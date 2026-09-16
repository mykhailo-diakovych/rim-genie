// Per-visit discount: "percent" uses discountPercent, "fixed" uses discountFixedCents (cents);
// either way the resolved amount lands in the derived `quote.discountAmount`.

export const DISCOUNT_CAP_PERCENT = 15;

export type QuoteDiscountType = "percent" | "fixed";

export type QuoteDiscountInput = {
  discountType: QuoteDiscountType;
  discountPercent: number;
  discountFixedCents: number;
};

export function quoteDiscountCents(subtotal: number, discount: QuoteDiscountInput): number {
  if (subtotal <= 0) return 0;
  const raw =
    discount.discountType === "fixed"
      ? discount.discountFixedCents
      : Math.round((subtotal * discount.discountPercent) / 100);
  return Math.min(Math.max(raw, 0), subtotal);
}

export function discountEffectivePercent(subtotal: number, discountCents: number): number {
  if (subtotal <= 0) return 0;
  return (discountCents / subtotal) * 100;
}

// Beyond the cap requires admin authority (or the discount-request approval flow).
export function exceedsDiscountCap(subtotal: number, discount: QuoteDiscountInput): boolean {
  if (discount.discountType === "fixed") {
    return discountEffectivePercent(subtotal, discount.discountFixedCents) > DISCOUNT_CAP_PERCENT;
  }
  return discount.discountPercent > DISCOUNT_CAP_PERCENT;
}
