import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CompleteJobDialog } from "./complete-job-dialog";
import { type InProgressJob } from "./types";
import { UploadProofsDialog } from "./upload-proofs-dialog";

export function JobCard({ job, onView }: { job: InProgressJob; onView: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-4">
          <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
            {job.customer}
          </span>
          {job.assignee && (
            <span className="rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white">
              {job.assignee}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-rubik text-[12px] leading-[14px]">
          <span className="text-label">Job ID:</span>
          <span className="text-body">{job.id}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Date:</span>
          <span className="text-body">{job.date}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button onClick={onView}>
          <Eye />
          View
        </Button>

        {job.action === "done" ? <CompleteJobDialog job={job} /> : <UploadProofsDialog job={job} />}
      </div>
    </div>
  );
}
