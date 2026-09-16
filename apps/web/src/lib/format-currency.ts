export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Digit-string arithmetic, not parseFloat * 100 — 19.99 * 100 is 1998.9999999999998.
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;

  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;

  const whole = match[1] ?? "";
  const fraction = match[2] ?? "";
  if (whole === "" && fraction === "") return null;

  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0") || "0");
}

// The editable form of an amount: plain digits with two decimals, no symbol or separators.
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatDollars(dollars: number): string {
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
