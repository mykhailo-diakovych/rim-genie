import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DialogCustomerRow, DialogHeader, DialogModal } from "./dialog-shared";
import { type InProgressJob } from "./types";

export function CompleteJobDialog({ job }: { job: InProgressJob }) {
  const [notes, setNotes] = useState("");
  const [techCode, setTechCode] = useState("");

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button color="success" />}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 11.4787C10 11.4787 10.6667 11.6681 11 12.3347C11.3333 13.0014 11.7308 10.6681 12.672 10.3347M6.24579 6.66621C6.24579 4.38001 6.21334 2.8871 7.04808 2.09425C7.88275 1.30141 8.25145 1.33351 11.9491 1.33351C12.3064 1.33206 12.4863 1.74259 12.2336 1.98263L10.3298 3.79143C9.84654 4.25055 9.84521 4.99489 10.3285 5.45395C10.8118 5.91302 11.5954 5.91307 12.0788 5.45407L13.9831 3.6457C14.2358 3.40573 14.668 3.57656 14.6665 3.91597C14.6665 5.73892 14.6756 6.71003 14.5676 7.33333M6.24579 6.66621L1.91469 10.7811C1.13955 11.5174 1.13955 12.7113 1.91469 13.4478C2.68983 14.1841 3.94657 14.1841 4.7217 13.4478L6.66667 11.5997M6.24579 6.66621C6.24622 7.4625 6.61408 8.17779 7.19702 8.66667M3.44489 12H3.4386M14.6667 11.332C14.6667 13.1729 13.1743 14.6653 11.3333 14.6653C9.4924 14.6653 8 13.1729 8 11.332C8 9.49107 9.4924 7.99867 11.3333 7.99867C13.1743 7.99867 14.6667 9.49107 14.6667 11.332Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
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
            <Dialog.Close render={<Button variant="ghost" />}>
              Cancel
            </Dialog.Close>
            <Dialog.Close
              render={<Button color="success" />}
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
