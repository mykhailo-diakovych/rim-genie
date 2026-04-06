import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectOption,
} from "@/components/ui/select";

interface AddNewClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    phone: string;
    email?: string;
    birthdayDay?: number;
    birthdayMonth?: number;
    discount?: number;
    isVip?: boolean;
  }) => void;
  isLoading: boolean;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

interface ValidationErrors {
  firstName?: string;
  phone?: string;
  email?: string;
  discount?: string;
}

export function AddNewClientDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
}: AddNewClientDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdayDay, setBirthdayDay] = useState<number | null>(null);
  const [birthdayMonth, setBirthdayMonth] = useState<number | null>(null);
  const [discount, setDiscount] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): ValidationErrors {
    const errs: ValidationErrors = {};
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!phone.trim()) errs.phone = "Phone number is required";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Invalid email address";
    if (discount && (Number(discount) < 0 || Number(discount) > 100))
      errs.discount = "Must be 0–100";
    return errs;
  }

  function handleClose() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setBirthdayDay(null);
    setBirthdayMonth(null);
    setDiscount("");
    setIsVip(false);
    setErrors({});
    setSubmitted(false);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const fullPhone = phone.startsWith("+") ? phone : `+1 876 ${phone}`;
    onSubmit({
      name: fullName,
      phone: fullPhone,
      email: email.trim() || undefined,
      birthdayDay: birthdayDay ?? undefined,
      birthdayMonth: birthdayMonth ?? undefined,
      discount: discount ? parseInt(discount, 10) : undefined,
      isVip: isVip || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[520px]" showCloseButton={false}>
        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Header */}
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>

          {/* Body */}
          <div className="flex flex-col gap-6 p-3">
            <div className="flex flex-col gap-3">
              {/* Row: First Name + Last Name */}
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-rubik text-xs leading-3.5 text-label">First Name:</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (submitted) setErrors((prev) => ({ ...prev, firstName: undefined }));
                    }}
                    className={`flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none ${errors.firstName ? "border-red/50" : "border-field-line"}`}
                  />
                  {errors.firstName && (
                    <span className="font-rubik text-xs leading-3.5 text-red">
                      {errors.firstName}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-rubik text-xs leading-3.5 text-label">Last Name:</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none"
                  />
                </div>
              </div>

              {/* Row: Email + Mobile Phone */}
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-rubik text-xs leading-3.5 text-label">Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (submitted) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none ${errors.email ? "border-red/50" : "border-field-line"}`}
                  />
                  {errors.email && (
                    <span className="font-rubik text-xs leading-3.5 text-red">{errors.email}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-rubik text-xs leading-3.5 text-label">Mobile Phone:</label>
                  <div
                    className={`flex h-9 w-full items-center gap-1 overflow-hidden rounded-lg border bg-white px-2 ${errors.phone ? "border-red/50" : "border-field-line"}`}
                  >
                    <span className="shrink-0 border-r border-field-line pr-1.5 font-rubik text-xs leading-3.5 text-body">
                      +1 876
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (submitted) setErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      placeholder="000-0000"
                      className="min-w-0 flex-1 bg-transparent font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost"
                    />
                  </div>
                  {errors.phone && (
                    <span className="font-rubik text-xs leading-3.5 text-red">{errors.phone}</span>
                  )}
                </div>
              </div>

              {/* Row: Day of birth (day + month) */}
              <div className="flex w-1/2 gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-rubik text-xs leading-3.5 text-label">Day of birth</label>
                  <Select value={birthdayDay} onValueChange={(v) => setBirthdayDay(v as number)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectPopup>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectOption key={day} value={day}>
                          {day}
                        </SelectOption>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-rubik text-xs leading-3.5 text-label">
                    Month of birth
                  </label>
                  <Select
                    value={birthdayMonth}
                    onValueChange={(v) => setBirthdayMonth(v as number)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectPopup>
                      {MONTHS.map((m) => (
                        <SelectOption key={m.value} value={m.value}>
                          {m.label}
                        </SelectOption>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-field-line" />

              {/* Discount % */}
              <div className="flex w-[105px] flex-col gap-1">
                <label className="font-rubik text-xs leading-3.5 text-label">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => {
                    setDiscount(e.target.value);
                    if (submitted) setErrors((prev) => ({ ...prev, discount: undefined }));
                  }}
                  className={`flex h-9 w-full rounded-lg border bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none ${errors.discount ? "border-red/50" : "border-field-line"}`}
                />
                {errors.discount && (
                  <span className="font-rubik text-xs leading-3.5 text-red">{errors.discount}</span>
                )}
              </div>

              {/* VIP customer checkbox */}
              <div className="flex h-9 items-center">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <CheckboxPrimitive.Root
                    checked={isVip}
                    onCheckedChange={(checked) => setIsVip(!!checked)}
                    className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-[1.2px] border-[#cdcfd1] bg-white transition-colors outline-none data-checked:border-blue data-checked:bg-blue"
                  >
                    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
                      <Check className="size-3" />
                    </CheckboxPrimitive.Indicator>
                  </CheckboxPrimitive.Root>
                  <span className="font-rubik text-sm leading-[18px] text-body">VIP customer</span>
                </label>
              </div>
            </div>

            {/* Footer buttons */}
            <DialogFooter className="p-0">
              <Button variant="ghost" type="button" onClick={handleClose} className="w-18">
                Cancel
              </Button>
              <Button color="success" type="submit" disabled={isLoading} className="w-32">
                {!isLoading && <Plus />}
                {isLoading ? "Creating..." : "Create Customer"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
