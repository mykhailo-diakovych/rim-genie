import { useState } from "react";

import { Camera, Upload } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { DialogCustomerRow } from "./dialog-shared";
import { type InProgressJob } from "./types";

export function UploadProofsDialog({ job }: { job: InProgressJob }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [photoStatus, setPhotoStatus] = useState<"before" | "after">("after");

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" color="success" />}>
        <Camera />
        Proofs
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Upload Job Proofs</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-3 pb-3">
          <div className="flex flex-col gap-3">
            <DialogCustomerRow customer={job.customer} jobId={job.id} />

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">File Attachment:</label>
              <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-field-line bg-white px-6 py-4 transition-colors hover:bg-[#f0f5fa]/50">
                <div className="flex size-11 items-center justify-center rounded-md bg-[#f0f5fa]">
                  <Upload className="size-4 text-blue" />
                </div>
                {files && files.length > 0 ? (
                  <div className="flex flex-col items-center gap-1">
                    {Array.from(files).map((f) => (
                      <p
                        key={f.name}
                        className="text-center font-rubik text-xs leading-3.5 font-medium text-body"
                      >
                        {f.name}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-center font-rubik text-sm leading-[18px] text-body">
                      Click to upload photo or video recording
                    </p>
                    <p className="text-center font-rubik text-xs leading-normal text-label">
                      JPG, PNG (max. 10MB)
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                />
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">File Name:</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="h-9 w-full rounded-md border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none focus:border-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">Notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[70px] w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-label focus:border-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-rubik text-xs leading-3.5 text-label">Photo Status</span>
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
                    <span className="font-rubik text-sm leading-[18px] text-body">
                      {val === "before" ? "Before" : "After"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button color="success" className="w-32" />}>
              Upload proofs
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
