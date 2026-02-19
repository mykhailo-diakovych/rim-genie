import { useRef, useState } from "react";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePinState() {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function handlePinChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const next = [...pin];
      next[index - 1] = "";
      setPin(next);
      inputsRef.current[index - 1]?.focus();
    }
  }

  function resetPin() {
    setPin(["", "", "", "", "", ""]);
  }

  return { pin, inputsRef, handlePinChange, handlePinKeyDown, resetPin };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PinInputProps {
  pin: string[];
  inputsRef: React.MutableRefObject<Array<HTMLInputElement | null>>;
  onPinChange: (index: number, value: string) => void;
  onPinKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PinInput({ pin, inputsRef, onPinChange, onPinKeyDown }: PinInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-rubik text-[12px] leading-[14px] text-label">
        Technician Code:
      </label>
      <div className="flex gap-2">
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            placeholder="0"
            onChange={(e) => onPinChange(i, e.target.value)}
            onKeyDown={(e) => onPinKeyDown(i, e)}
            className="h-9 min-w-0 flex-1 rounded-[8px] border border-field-line bg-white text-center font-rubik text-[14px] leading-[18px] text-body outline-none focus:border-blue"
          />
        ))}
      </div>
    </div>
  );
}
