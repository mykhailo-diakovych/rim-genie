import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { Camera, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

import { DialogCustomerRow, DialogHeader, DialogModal } from "./dialog-shared";
import { type InProgressJob } from "./types";

export function UploadProofsDialog({ job }: { job: InProgressJob }) {
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [photoStatus, setPhotoStatus] = useState<"before" | "after">("after");

  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-green font-rubik text-[12px] leading-[14px] text-green transition-colors hover:bg-green/5">
        <Camera className="size-4" />
        Proofs
      </Dialog.Trigger>

      <DialogModal className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader title="Upload Job Proofs" />

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={job.customer} jobId={job.id} />

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">
                File Attachment:
              </label>
              <label className="flex h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border border-field-line bg-white px-6 py-4 transition-colors hover:bg-[#f0f5fa]/50">
                <div className="flex size-11 items-center justify-center rounded-[8px] bg-[#f0f5fa]">
                  <Upload className="size-4 text-blue" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="font-rubik text-[14px] leading-[18px] text-center text-[#032906]">
                    Click to upload photo or video recording
                  </p>
                  <p className="font-rubik text-[12px] leading-normal text-center text-[#787a78]">
                    JPG, PNG (max. 10MB)
                  </p>
                </div>
                <input type="file" className="sr-only" accept="image/*,video/*" multiple />
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">
                File Name:
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-field-line bg-white px-2 font-rubik text-[12px] leading-[14px] text-body outline-none focus:border-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-[12px] leading-[14px] text-label">Notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[70px] w-full resize-none rounded-[8px] border border-field-line bg-white p-2 font-rubik text-[14px] leading-[18px] text-body outline-none placeholder:text-[#a0a3a0] focus:border-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-rubik text-[12px] leading-[14px] text-label">
                Photo Status
              </span>
              <div className="flex h-9 items-center gap-8">
                {(["before", "after"] as const).map((val) => (
                  <label key={val} className="flex cursor-pointer items-center gap-1.5">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        photoStatus === val ? "border-blue" : "border-[#cdcfd1]",
                      )}
                    >
                      {photoStatus === val && <span className="size-2.5 rounded-full bg-blue" />}
                    </span>
                    <input
                      type="radio"
                      className="sr-only"
                      name={`photoStatus-${job.id}`}
                      value={val}
                      checked={photoStatus === val}
                      onChange={() => setPhotoStatus(val)}
                    />
                    <span className="font-rubik text-[14px] leading-[18px] text-[#032906]">
                      {val === "before" ? "Before" : "After"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Dialog.Close className="flex h-9 w-[128px] items-center justify-center rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-opacity hover:opacity-90">
              Upload proofs
            </Dialog.Close>
          </div>
        </div>
      </DialogModal>
    </Dialog.Root>
  );
}
