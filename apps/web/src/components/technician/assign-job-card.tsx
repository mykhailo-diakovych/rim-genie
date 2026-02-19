import { CheckCircle2, Eye } from "lucide-react";

import { AcceptJobDialog } from "./accept-job-dialog";
import { type AssignJob } from "./types";

export function AssignJobCard({ job, onView }: { job: AssignJob; onView: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
          {job.customer}
        </span>
        <div className="flex items-center gap-2 font-rubik text-[12px] leading-[14px]">
          <span className="text-label">Job ID:</span>
          <span className="text-body">{job.id}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Date:</span>
          <span className="text-body">{job.date}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] bg-blue font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-blue/90"
        >
          <Eye className="size-4" />
          View
        </button>
        <AcceptJobDialog
          customer={job.customer}
          jobId={job.id}
          triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-opacity hover:opacity-90"
          triggerContent={
            <>
              <CheckCircle2 className="size-4" />
              Accept
            </>
          }
        />
      </div>
    </div>
  );
}
