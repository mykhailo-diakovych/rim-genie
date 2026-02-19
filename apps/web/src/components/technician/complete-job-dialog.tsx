import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { DialogCustomerRow, DialogHeader, DialogModal } from "./dialog-shared";
import { type InProgressJob } from "./types";

export function CompleteJobDialog({ job }: { job: InProgressJob }) {
  const [notes, setNotes] = useState("");
  const [techCode, setTechCode] = useState("");

  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-green/90">
        <CheckCircle2 className="size-4" />
        Done
      </Dialog.Trigger>

      <DialogModal className="overflow-hidden">
        <DialogHeader title="Complete Job" />

        {/* Warning banner */}
        <div className="flex items-start gap-4 bg-[#fee4e2] px-3 py-2">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[28px] bg-[#f2cecc]">
            <AlertCircle className="size-6 text-[#d92d20]" />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <p className="font-rubik text-[14px] leading-[18px] font-medium text-body">
              Please Remember
            </p>
            <p className="font-rubik text-[12px] leading-[14px] text-label">
              Please remember to upload all photos and videos of the job before completing
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={job.customer} jobId={job.id} />

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">Notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[70px] w-full resize-none rounded-[8px] border border-field-line bg-white p-2 font-rubik text-[14px] leading-[18px] text-body outline-none placeholder:text-[#a0a3a0] focus:border-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">
                Technician Code:
              </label>
              <input
                type="text"
                value={techCode}
                onChange={(e) => setTechCode(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-field-line bg-white px-2 font-rubik text-[12px] leading-[14px] text-body outline-none focus:border-blue"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Dialog.Close className="flex h-9 w-[72px] items-center justify-center rounded-[8px] font-rubik text-[12px] leading-[14px] text-body transition-colors hover:bg-black/5">
              Cancel
            </Dialog.Close>
            <Dialog.Close
              className="flex h-9 w-[128px] items-center justify-center rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-opacity hover:opacity-90"
              onClick={() => {
                setNotes("");
                setTechCode("");
              }}
            >
              Done
            </Dialog.Close>
          </div>
        </div>
      </DialogModal>
    </Dialog.Root>
  );
}
