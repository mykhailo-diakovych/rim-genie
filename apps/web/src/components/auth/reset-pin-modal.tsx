import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";

const pinSchema = z
  .string()
  .length(6, m.validation_pin_six_digits())
  .regex(/^\d+$/, m.validation_pin_six_digits());

interface ResetPinModalProps {
  trigger: React.ReactNode;
}

export function ResetPinModal({ trigger }: ResetPinModalProps) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [newPinError, setNewPinError] = useState("");
  const [confirmPinError, setConfirmPinError] = useState("");

  function handleReset() {
    setNewPinError("");
    setConfirmPinError("");
    const result = pinSchema.safeParse(newPin);
    if (!result.success) {
      setNewPinError(result.error.issues[0]?.message ?? m.validation_pin_invalid());
      return;
    }
    if (newPin !== confirmPin) {
      setConfirmPinError(m.validation_pins_mismatch());
      return;
    }
    toast.info(m.toast_reset_pin_soon());
  }

  function handleCancel() {
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
    setNewPinError("");
    setConfirmPinError("");
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<span />}>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-field-line py-3 pr-2 pl-3">
            <p className="font-rubik text-[16px] leading-[20px] font-medium text-body">
              {m.reset_pin_title()}
            </p>
            <Dialog.Close className="flex items-center rounded-[6px] p-1 text-label transition-colors hover:text-body">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-6 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>{m.label_old_pin()}</Label>
                <Input type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1">
                <Label>{m.label_new_pin()}</Label>
                <Input
                  type="password"
                  value={newPin}
                  error={!!newPinError}
                  onChange={(e) => setNewPin(e.target.value)}
                />
                {newPinError && <p className="font-rubik text-[12px] text-red">{newPinError}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>{m.label_confirm_pin()}</Label>
                <Input
                  type="password"
                  value={confirmPin}
                  error={!!confirmPinError}
                  onChange={(e) => setConfirmPin(e.target.value)}
                />
                {confirmPinError && (
                  <p className="font-rubik text-[12px] text-red">{confirmPinError}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Dialog.Close
                render={
                  <Button variant="ghost" onClick={handleCancel}>
                    {m.btn_cancel()}
                  </Button>
                }
              />
              <Button variant="success" onClick={handleReset}>
                {m.btn_reset()}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
