import { Calendar } from "lucide-react";

import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DATE_RANGES = ["today", "7d", "30d", "90d", "all"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export function getDateFrom(range: DateRange): string | undefined {
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

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
      <SelectTrigger className="w-36">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-4 shrink-0 text-label" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectPopup>
        {DATE_RANGES.map((range) => (
          <SelectOption key={range} value={range}>
            {DATE_RANGE_LABELS[range]}
          </SelectOption>
        ))}
      </SelectPopup>
    </Select>
  );
}
