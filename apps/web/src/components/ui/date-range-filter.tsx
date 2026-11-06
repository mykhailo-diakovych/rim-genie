import { useEffect, useState } from "react";
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

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

const rangeDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDateRangeLabel(range: DateRange): string {
  if (!isCustomRange(range)) return DATE_RANGE_LABELS[range];
  const from = range.from ? rangeDateFormat.format(parseLocalDate(range.from)) : null;
  const to = range.to ? rangeDateFormat.format(parseLocalDate(range.to)) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return DATE_RANGE_LABELS.all;
}

export function isDatePreset(value: unknown): value is DatePreset {
  return typeof value === "string" && (DATE_RANGES as readonly string[]).includes(value);
}

export function getDateFrom(range: DateRange): string | undefined {
  if (isCustomRange(range)) {
    if (!range.from) return undefined;
    const d = parseLocalDate(range.from);
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
  const d = parseLocalDate(range.to);
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

function toDateInputValue(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function defaultCustomRange(): CustomRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
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
            if (!isCustomRange(value)) onChange(defaultCustomRange());
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

      {isCustomRange(value) && <CustomRangeInputs value={value} onChange={onChange} />}
    </div>
  );
}

// Native date inputs emit partial years while typing (0002, 0020…); only complete, ordered dates are applied.
function isCompleteDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900;
}

const dateInputClass =
  "h-9 rounded-md border border-field-line bg-white px-2 font-rubik text-sm leading-5 text-body outline-none focus:border-blue";

function CustomRangeInputs({
  value,
  onChange,
}: {
  value: CustomRange;
  onChange: (value: DateRange) => void;
}) {
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  useEffect(() => {
    setFrom(value.from ?? "");
    setTo(value.to ?? "");
  }, [value.from, value.to]);

  function commit(nextFrom: string, nextTo: string) {
    if (nextFrom && !isCompleteDate(nextFrom)) return;
    if (nextTo && !isCompleteDate(nextTo)) return;
    if (nextFrom && nextTo && nextFrom > nextTo) return;
    if (nextFrom === (value.from ?? "") && nextTo === (value.to ?? "")) return;
    onChange({ from: nextFrom || null, to: nextTo || null });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        aria-label="From date"
        value={from}
        max={to || undefined}
        onChange={(e) => {
          setFrom(e.target.value);
          commit(e.target.value, to);
        }}
        className={dateInputClass}
      />
      <span className="font-rubik text-sm text-label">to</span>
      <input
        type="date"
        aria-label="To date"
        value={to}
        min={from || undefined}
        onChange={(e) => {
          setTo(e.target.value);
          commit(from, e.target.value);
        }}
        className={dateInputClass}
      />
    </div>
  );
}
