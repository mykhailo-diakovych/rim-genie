import { useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { centsToInputValue, formatCents, parseDollarsToCents } from "@/lib/format-currency";

interface LinePriceCellProps {
  totalCents: number;
  priceOverridden: boolean;
  canEdit: boolean;
  isSaving?: boolean;
  onSave: (totalCents: number) => void;
  onReset?: () => void;
}

export function LinePriceCell({
  totalCents,
  priceOverridden,
  canEdit,
  isSaving = false,
  onSave,
  onReset,
}: LinePriceCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against blur double-firing the commit after Enter/Escape.
  const settledRef = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const parsed = parseDollarsToCents(draft);
  const isInvalid = editing && parsed === null;

  function begin() {
    settledRef.current = false;
    setDraft(centsToInputValue(totalCents));
    setEditing(true);
  }

  function cancel() {
    settledRef.current = true;
    setEditing(false);
  }

  function commit() {
    if (settledRef.current) return;
    settledRef.current = true;
    setEditing(false);
    if (parsed === null || parsed === totalCents) return;
    onSave(parsed);
  }

  if (!canEdit) {
    return <span className="text-sm text-body">{formatCents(totalCents)}</span>;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div
          className={`flex h-9 w-full items-center gap-1 rounded-md border bg-white px-2 ${
            isInvalid ? "border-red/50" : "border-field-line"
          }`}
        >
          <span className="text-xs text-ghost">$</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            aria-label="Line total"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className="min-w-0 flex-1 bg-transparent font-rubik text-xs leading-3.5 text-body outline-none"
          />
        </div>
        <span className="font-rubik text-xs text-label">Enter to save, Esc to cancel</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={begin}
          disabled={isSaving}
          className="group flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-sm text-body transition-colors hover:bg-page disabled:opacity-50"
        >
          {formatCents(totalCents)}
          <Pencil className="size-3.5 text-ghost opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        {priceOverridden && onReset && (
          <Tooltip>
            <TooltipTrigger delay={200} render={<span />}>
              <button
                type="button"
                aria-label="Restore the generated price"
                onClick={onReset}
                disabled={isSaving}
                className="rounded-sm p-0.5 text-ghost transition-colors hover:text-body disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Restore the generated price</TooltipContent>
          </Tooltip>
        )}
      </div>
      {priceOverridden && (
        <span className="rounded-full bg-badge-orange px-1.5 py-0.5 font-rubik text-[10px] leading-normal text-white">
          MANUAL PRICE
        </span>
      )}
    </div>
  );
}
