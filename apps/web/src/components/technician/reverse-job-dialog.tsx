import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { client, orpc } from "@/utils/orpc";

import { DialogCustomerRow } from "./dialog-shared";
import { PinInput, usePinState } from "./pin-input";

interface ReverseJobDialogProps {
  customer: string;
  jobId: string;
  jobIds: string[];
  technicianId: string;
  triggerClassName: string;
  triggerContent: React.ReactNode;
}

export function ReverseJobDialog({
  customer,
  jobId,
  jobIds,
  technicianId,
  triggerClassName,
  triggerContent,
}: ReverseJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pin, inputsRef, handlePinChange, handlePinKeyDown, resetPin } = usePinState();
  const queryClient = useQueryClient();

  const reverseMutation = useMutation({
    mutationFn: async () => {
      const pinString = pin.join("");
      if (!reason.trim()) throw new Error("Please enter a reversal reason");
      if (pinString.length !== 6) throw new Error("Please enter a complete 6-digit code");

      const { valid } = await client.technician.jobs.verifyPin({
        userId: technicianId,
        pin: pinString,
      });
      if (!valid) throw new Error("Invalid technician code");

      for (const id of jobIds) {
        await client.technician.jobs.reverse({ jobId: id, reason: reason.trim() });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.technician.jobs.list.key() });
      toast.success("Job reversed");
      resetForm();
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetForm() {
    setReason("");
    resetPin();
  }

  function handleConfirm() {
    reverseMutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
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
                className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-4.5 text-body outline-none placeholder:text-label focus:border-blue"
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
            <Button
              color="destructive"
              className="w-32"
              disabled={reverseMutation.isPending}
              onClick={handleConfirm}
            >
              {reverseMutation.isPending ? "Reversing..." : "Reverse"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
