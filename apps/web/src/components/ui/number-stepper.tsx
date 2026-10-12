import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

const stepButtonClass =
  "flex w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center text-body transition-colors outline-none select-none hover:bg-page focus-visible:bg-page active:bg-page disabled:pointer-events-none disabled:text-ghost [&_svg]:size-4";

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: NumberStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(String(value));
  }

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const parse = (raw: string) => (/^-?\d+$/.test(raw) ? Number(raw) : null);

  const commit = (next: number) => {
    const clamped = clamp(next);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const current = clamp(parse(draft) ?? value);

  const handleInput = (raw: string) => {
    const sanitized = min < 0 ? raw.replace(/(?!^-)[^\d]/g, "") : raw.replace(/\D/g, "");
    setDraft(sanitized);
    const parsed = parse(sanitized);
    if (parsed !== null && parsed >= min && parsed <= max && parsed !== value) onChange(parsed);
  };

  const handleBlur = () => {
    const parsed = parse(draft);
    if (parsed === null) setDraft(String(value));
    else commit(parsed);
  };

  return (
    <div
      className={cn(
        "flex h-11 w-full items-stretch overflow-hidden rounded-md border border-field-line bg-white transition-colors focus-within:border-blue",
        disabled && "opacity-45",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        tabIndex={-1}
        disabled={disabled || current <= min}
        onClick={() => commit(current - step)}
        className={cn(stepButtonClass, "border-r border-field-line")}
      >
        <Minus />
      </button>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        role="spinbutton"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={min}
        aria-valuemax={max === Number.MAX_SAFE_INTEGER ? undefined : max}
        aria-valuenow={value}
        disabled={disabled}
        value={draft}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            commit(current + step);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            commit(current - step);
          } else if (e.key === "Enter") {
            handleBlur();
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-center font-rubik text-base text-body outline-none disabled:cursor-not-allowed"
      />
      <button
        type="button"
        aria-label="Increase"
        tabIndex={-1}
        disabled={disabled || current >= max}
        onClick={() => commit(current + step)}
        className={cn(stepButtonClass, "border-l border-field-line")}
      >
        <Plus />
      </button>
    </div>
  );
}

export { NumberStepper };
export type { NumberStepperProps };
