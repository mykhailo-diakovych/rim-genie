import { Calendar } from "lucide-react";

import { Select, SelectOption, SelectPopup, SelectTrigger } from "@/components/ui/select";

export const DATE_RANGES = ["today", "7d", "30d", "90d", "all"] as const;
export type DatePreset = (typeof DATE_RANGES)[number];

export type CustomRange = { from: string | null; to: string | null };
export type DateRange = DatePreset | CustomRange;

export const DATE_RANGE_LABELS: Record<DatePreset, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export function isCustomRange(range: DateRange): range is CustomRange {
  return typeof range === "object" && range !== null;
}

export function getDateFrom(range: DateRange): string | undefined {
  if (isCustomRange(range)) {
    if (!range.from) return undefined;
    const d = new Date(range.from);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === "all") return undefined;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getDateTo(range: DateRange): string | undefined {
  if (!isCustomRange(range) || !range.to) return undefined;
  const d = new Date(range.to);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function parseDateRange(value: unknown, fallback: DateRange): DateRange {
  if (typeof value === "string" && (DATE_RANGES as readonly string[]).includes(value)) {
    return value as DatePreset;
  }
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("from" in v || "to" in v) {
      return {
        from: typeof v.from === "string" && v.from ? v.from : null,
        to: typeof v.to === "string" && v.to ? v.to : null,
      };
    }
  }
  return fallback;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={isCustomRange(value) ? "custom" : value}
        onValueChange={(v) => {
          if (v === "custom") {
            if (!isCustomRange(value)) onChange({ from: null, to: null });
          } else {
            onChange(v as DatePreset);
          }
        }}
      >
        <SelectTrigger className="w-40">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 text-label" />
            <span className="truncate">
              {isCustomRange(value) ? "Custom range" : DATE_RANGE_LABELS[value]}
            </span>
          </div>
        </SelectTrigger>
        <SelectPopup>
          {DATE_RANGES.map((range) => (
            <SelectOption key={range} value={range}>
              {DATE_RANGE_LABELS[range]}
            </SelectOption>
          ))}
          <SelectOption value="custom">Custom range</SelectOption>
        </SelectPopup>
      </Select>

      {isCustomRange(value) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            aria-label="From date"
            value={value.from ?? ""}
            max={value.to ?? undefined}
            onChange={(e) => onChange({ from: e.target.value || null, to: value.to })}
            className="h-9 rounded-md border border-field-line bg-white px-2 font-rubik text-sm leading-5 text-body outline-none focus:border-blue"
          />
          <span className="font-rubik text-sm text-label">to</span>
          <input
            type="date"
            aria-label="To date"
            value={value.to ?? ""}
            min={value.from ?? undefined}
            onChange={(e) => onChange({ from: value.from, to: e.target.value || null })}
            className="h-9 rounded-md border border-field-line bg-white px-2 font-rubik text-sm leading-5 text-body outline-none focus:border-blue"
          />
        </div>
      )}
    </div>
  );
}
