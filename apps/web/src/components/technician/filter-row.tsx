import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";

interface FilterRowProps {
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  technicians?: Array<{ id: string; name: string }>;
  technicianId: string;
  onTechnicianIdChange: (value: string) => void;
}

export function FilterRow({
  dateRange,
  onDateRangeChange,
  technicians,
  technicianId,
  onTechnicianIdChange,
}: FilterRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {technicians && technicians.length > 0 && (
        <Select value={technicianId} onValueChange={(v) => onTechnicianIdChange(v ?? "")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Technicians">
              {(value) => {
                if (!value) return "All Technicians";
                return technicians?.find((t) => t.id === value)?.name ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectOption value="">All Technicians</SelectOption>
            {technicians.map((t) => (
              <SelectOption key={t.id} value={t.id}>
                {t.name}
              </SelectOption>
            ))}
          </SelectPopup>
        </Select>
      )}

      <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
    </div>
  );
}
