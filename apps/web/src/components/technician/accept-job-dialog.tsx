import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { Calendar } from "lucide-react";

import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DialogCustomerRow, DialogHeader, DialogModal } from "./dialog-shared";
import { PinInput, usePinState } from "./pin-input";

interface AcceptJobDialogProps {
  customer: string;
  jobId: string;
  triggerClassName: string;
  triggerContent: React.ReactNode;
}

export function AcceptJobDialog({
  customer,
  jobId,
  triggerClassName,
  triggerContent,
}: AcceptJobDialogProps) {
  const [technician, setTechnician] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const { pin, inputsRef, handlePinChange, handlePinKeyDown, resetPin } = usePinState();

  function handleConfirm() {
    setTechnician("");
    setCompletionDate("");
    resetPin();
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger className={triggerClassName}>{triggerContent}</Dialog.Trigger>

      <DialogModal>
        <DialogHeader title="Accept Job" />

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={customer} jobId={jobId} />

            <Select value={technician} onValueChange={(v) => setTechnician(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Technician" />
              </SelectTrigger>
              <SelectPopup>
                <SelectOption value="heaven-dev">heaven dev</SelectOption>
                <SelectOption value="ankit-patel">ankit patel</SelectOption>
                <SelectOption value="darshan-prajapati">darshan Prajapati</SelectOption>
              </SelectPopup>
            </Select>

            <Select value={completionDate} onValueChange={(v) => setCompletionDate(v ?? "")}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0 text-ghost" />
                  <SelectValue placeholder="Select expected completion date" />
                </div>
              </SelectTrigger>
              <SelectPopup>
                <SelectOption value="today">Today</SelectOption>
                <SelectOption value="tomorrow">Tomorrow</SelectOption>
                <SelectOption value="week">In a week</SelectOption>
              </SelectPopup>
            </Select>

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
              className="flex h-9 w-[128px] items-center justify-center rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-opacity hover:opacity-90"
              onClick={handleConfirm}
            >
              Accept
            </Dialog.Close>
          </div>
        </div>
      </DialogModal>
    </Dialog.Root>
  );
}
