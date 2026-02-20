import { useState } from "react";

import { Calendar } from "lucide-react";

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
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DialogCustomerRow } from "./dialog-shared";
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
    <Dialog>
      <DialogTrigger className={triggerClassName}>{triggerContent}</DialogTrigger>

      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Accept Job</DialogTitle>
        </DialogHeader>

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

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <DialogClose
              render={<Button color="success" className="w-32" />}
              onClick={handleConfirm}
            >
              Accept
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
