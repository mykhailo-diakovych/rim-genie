import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  prefix: string;
  onPrefixChange: (prefix: string) => void;
  number: string;
  onNumberChange: (number: string) => void;
  error?: string;
}

export function parsePhoneToComponents(fullPhone: string): { prefix: string; number: string } {
  const digits = fullPhone.replace(/\D/g, "");
  if (digits.length >= 7) {
    const numberDigits = digits.slice(-7);
    const prefixDigits = digits.slice(0, -7);
    const formatted = numberDigits.slice(0, 3) + "-" + numberDigits.slice(3);
    return { prefix: prefixDigits || "1876", number: formatted };
  }
  return { prefix: "1876", number: "" };
}

export function composePhone(prefix: string, number: string): string {
  const digits = number.replace(/\D/g, "");
  const formatted = digits.length >= 3 ? digits.slice(0, 3) + "-" + digits.slice(3) : digits;
  return `+${prefix} ${formatted}`;
}

function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 3) return digits;
  return digits.slice(0, 3) + "-" + digits.slice(3);
}

export function PhoneInput({
  prefix,
  onPrefixChange,
  number,
  onNumberChange,
  error,
}: PhoneInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-rubik text-xs leading-3.5 text-label">Mobile Phone:</label>
      <div
        className={cn(
          "flex h-9 w-full items-center overflow-hidden rounded-lg border bg-white",
          error ? "border-red/50" : "border-field-line",
        )}
      >
        <div className="flex h-full shrink-0 items-center gap-0.5 border-r border-field-line px-2">
          <span className="font-rubik text-xs leading-3.5 text-body">+</span>
          <input
            type="text"
            value={prefix}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
              onPrefixChange(digits);
            }}
            className="w-10 bg-transparent font-rubik text-xs leading-3.5 text-body outline-none"
          />
        </div>
        <input
          type="tel"
          value={number}
          onChange={(e) => {
            onNumberChange(formatPhoneNumber(e.target.value));
          }}
          placeholder="000-0000"
          className="min-w-0 flex-1 bg-transparent px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost"
        />
      </div>
      {error && <p className="font-rubik text-xs text-red">{error}</p>}
    </div>
  );
}
