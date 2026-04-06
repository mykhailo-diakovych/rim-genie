import { useRef } from "react";

import { Asterisk } from "lucide-react";
import { tv } from "tailwind-variants";

const pinInputVariants = tv({
  slots: {
    root: "flex w-full gap-1",
    cell: "relative min-w-0 flex-1",
    digit:
      "h-9 w-full rounded-md border bg-white text-center text-transparent caret-transparent outline-none transition-colors focus:border-blue",
    overlay:
      "pointer-events-none absolute inset-0 flex items-center justify-center text-ghost",
  },
  variants: {
    error: {
      true: { digit: "border-red/50" },
      false: { digit: "border-field-line" },
    },
  },
  defaultVariants: {
    error: false,
  },
});

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

function PinInput({ value, onChange, error = false }: PinInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? "");
  const { root, cell, digit, overlay } = pinInputVariants({ error });

  function handleChange(index: number, char: string) {
    const d = char.replace(/\D/g, "").slice(-1);
    const next = digits.map((v, i) => (i === index ? d : v)).join("");
    onChange(next);
    if (d && index < 3) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        onChange(digits.map((v, i) => (i === index ? "" : v)).join(""));
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        onChange(digits.map((v, i) => (i === index - 1 ? "" : v)).join(""));
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const arr = digits.map((v, i) => pasted[i] ?? v);
    onChange(arr.join(""));
    refs.current[Math.min(pasted.length, 3)]?.focus();
  }

  return (
    <div className={root()}>
      {digits.map((d, i) => (
        <div key={i} className={cell()}>
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete="off"
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={digit()}
          />
          <span className={overlay()}>{d ? <Asterisk className="size-4" /> : null}</span>
        </div>
      ))}
    </div>
  );
}

export { PinInput };
