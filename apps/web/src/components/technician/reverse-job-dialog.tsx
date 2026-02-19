import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";

import { DialogCustomerRow, DialogHeader, DialogModal } from "./dialog-shared";
import { PinInput, usePinState } from "./pin-input";

interface ReverseJobDialogProps {
  customer: string;
  jobId: string;
  triggerClassName: string;
  triggerContent: React.ReactNode;
}

export function ReverseJobDialog({
  customer,
  jobId,
  triggerClassName,
  triggerContent,
}: ReverseJobDialogProps) {
  const [reason, setReason] = useState("");
  const { pin, inputsRef, handlePinChange, handlePinKeyDown, resetPin } = usePinState();

  function handleConfirm() {
    setReason("");
    resetPin();
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger className={triggerClassName}>{triggerContent}</Dialog.Trigger>

      <DialogModal>
        <DialogHeader title="Reverse Job" />

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={customer} jobId={jobId} />

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">
                Reversal Reason:
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-[70px] w-full resize-none rounded-[8px] border border-field-line bg-white p-2 font-rubik text-[14px] leading-[18px] text-body outline-none placeholder:text-[#a0a3a0] focus:border-blue"
              />
            </div>

            <PinInput
              pin={pin}
              inputsRef={inputsRef}
              onPinChange={handlePinChange}
              onPinKeyDown={handlePinKeyDown}
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <Dialog.Close className="flex h-9 w-[72px] items-center justify-center rounded-[8px] font-rubik text-[12px] leading-[14px] text-body transition-colors hover:bg-black/5">
              Cancel
            </Dialog.Close>
            <Dialog.Close
              className="flex h-9 w-[128px] items-center justify-center rounded-[8px] bg-[#db3e21] font-rubik text-[12px] leading-[14px] text-white transition-opacity hover:opacity-90"
              onClick={handleConfirm}
            >
              Reverse
            </Dialog.Close>
          </div>
        </div>
      </DialogModal>
    </Dialog.Root>
  );
}
