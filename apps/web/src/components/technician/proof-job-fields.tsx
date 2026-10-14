import type { ReactNode } from "react";

import { type JobGroup } from "./types";

export function ProofJobFields({
  group,
  notes,
  onNotesChange,
  notesPlaceholder,
  children,
}: {
  group: JobGroup;
  notes: string;
  onNotesChange: (notes: string) => void;
  notesPlaceholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 font-rubik">
      <div className="flex gap-4 border-b border-field-line pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs leading-3.5 text-label">Customer / Job Name</span>
          <span className="flex h-9 items-center truncate rounded-md border border-field-line bg-white px-2 text-sm leading-4.5 text-body">
            {group.customer}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs leading-3.5 text-label">Job ID</span>
          <span className="flex h-9 items-center text-sm leading-4.5 font-medium text-body">
            {group.invoiceNumber}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs leading-3.5 text-label">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={notesPlaceholder}
          className="h-32 w-full resize-none rounded-md border border-field-line bg-white p-2 text-sm leading-4.5 text-body outline-none placeholder:text-ghost focus:border-blue"
        />
      </label>

      {children}
    </div>
  );
}
