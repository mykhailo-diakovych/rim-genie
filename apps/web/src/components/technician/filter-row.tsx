import { useState } from "react";

import { Calendar, Info } from "lucide-react";

import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Info tooltip ─────────────────────────────────────────────────────────────

function InfoTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center justify-center text-ghost transition-colors hover:text-label"
      >
        <Info className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-[220px]">
            <div className="absolute right-[10px] -top-[5px] h-0 w-0 border-x-[8px] border-x-transparent border-b-[6px] border-b-white" />
            <div className="rounded-[8px] bg-white px-3 py-2 shadow-[0px_0px_32px_0px_rgba(10,13,18,0.1)]">
              <p className="font-rubik text-[14px] leading-[18px] text-[#1a1f1a]">
                This Date filter works on CreationDate based on Status
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Filter row ───────────────────────────────────────────────────────────────

export function FilterRow() {
  return (
    <div className="flex items-center justify-end gap-2">
      <Select defaultValue="all">
        <SelectTrigger className="w-[104px]">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectOption value="all">All</SelectOption>
          <SelectOption value="mine">Mine</SelectOption>
        </SelectPopup>
      </Select>

      <Select>
        <SelectTrigger className="w-[144px]">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 text-ghost" />
            <SelectValue placeholder="Select date" />
          </div>
        </SelectTrigger>
        <SelectPopup>
          <SelectOption value="today">Today</SelectOption>
          <SelectOption value="week">This week</SelectOption>
          <SelectOption value="month">This month</SelectOption>
        </SelectPopup>
      </Select>

      <InfoTooltip />
    </div>
  );
}
