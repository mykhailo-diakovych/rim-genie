import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { DialogCustomerRow } from "./dialog-shared";
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
    <Dialog>
      <DialogTrigger className={triggerClassName}>{triggerContent}</DialogTrigger>

      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Reverse Job</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={customer} jobId={jobId} />

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">Reversal Reason:</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-label focus:border-blue"
              />
            </div>

            <PinInput
              pin={pin}
              inputsRef={inputsRef}
              onPinChange={handlePinChange}
              onPinKeyDown={handlePinKeyDown}
            />
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <DialogClose render={<Button color="destructive" className="w-32" />} onClick={handleConfirm}>
              Reverse
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
