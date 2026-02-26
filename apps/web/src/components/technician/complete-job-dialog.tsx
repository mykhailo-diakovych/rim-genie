import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
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
import { type JobGroup } from "./types";

export function CompleteJobDialog({ group }: { group: JobGroup }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [techCode, setTechCode] = useState("");
  const queryClient = useQueryClient();
  const technicianId = group.jobs[0]?.technician?.id;

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!techCode.trim()) throw new Error("Please enter the technician code");
      if (!technicianId) throw new Error("No technician assigned");

      const { valid } = await client.technician.jobs.verifyPin({
        userId: technicianId,
        pin: techCode,
      });
      if (!valid) throw new Error("Invalid technician code");

      const incomplete = group.jobs.filter((j) => j.status !== "completed");
      for (const j of incomplete) {
        if (notes.trim()) {
          await client.technician.jobs.addNote({ jobId: j.id, specialNotes: notes });
        }
        await client.technician.jobs.complete({ jobId: j.id });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.technician.jobs.list.key() });
      toast.success("Job completed");
      resetForm();
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetForm() {
    setNotes("");
    setTechCode("");
  }

  function handleConfirm() {
    completeMutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button color="success" />}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 11.4787C10 11.4787 10.6667 11.6681 11 12.3347C11.3333 13.0014 11.7308 10.6681 12.672 10.3347M6.24579 6.66621C6.24579 4.38001 6.21334 2.8871 7.04808 2.09425C7.88275 1.30141 8.25145 1.33351 11.9491 1.33351C12.3064 1.33206 12.4863 1.74259 12.2336 1.98263L10.3298 3.79143C9.84654 4.25055 9.84521 4.99489 10.3285 5.45395C10.8118 5.91302 11.5954 5.91307 12.0788 5.45407L13.9831 3.6457C14.2358 3.40573 14.668 3.57656 14.6665 3.91597C14.6665 5.73892 14.6756 6.71003 14.5676 7.33333M6.24579 6.66621L1.91469 10.7811C1.13955 11.5174 1.13955 12.7113 1.91469 13.4478C2.68983 14.1841 3.94657 14.1841 4.7217 13.4478L6.66667 11.5997M6.24579 6.66621C6.24622 7.4625 6.61408 8.17779 7.19702 8.66667M3.44489 12H3.4386M14.6667 11.332C14.6667 13.1729 13.1743 14.6653 11.3333 14.6653C9.4924 14.6653 8 13.1729 8 11.332C8 9.49107 9.4924 7.99867 11.3333 7.99867C13.1743 7.99867 14.6667 9.49107 14.6667 11.332Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        Done
      </DialogTrigger>

      <DialogContent className="overflow-hidden sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 bg-[#fee4e2] px-3 py-2">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f2cecc]">
            <AlertCircle className="size-6 text-[#d92d20]" />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <p className="font-rubik text-sm leading-4.5 font-medium text-body">Please Remember</p>
            <p className="font-rubik text-xs leading-3.5 text-label">
              Please remember to upload all photos and videos of the job before completing
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={group.customer} jobId={String(group.invoiceNumber)} />

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">Notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-4.5 text-body outline-none placeholder:text-label focus:border-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">Technician Code:</label>
              <input
                type="text"
                value={techCode}
                onChange={(e) => setTechCode(e.target.value)}
                className="h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none focus:border-blue"
              />
            </div>
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button
              color="success"
              className="w-32"
              disabled={completeMutation.isPending}
              onClick={handleConfirm}
            >
              {completeMutation.isPending ? "Completing..." : "Done"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
