import { ChevronLeft } from "lucide-react";

function ReverseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="size-4 shrink-0">
      <path
        d="M7.33333 4H10.3333C11.9902 4 13.3333 5.34315 13.3333 7C13.3333 8.65687 11.9902 10 10.3333 10H2.66667M2.66667 10L4.66665 8M2.66667 10L4.66667 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ReverseJobDialog } from "./reverse-job-dialog";
import { type ApiJob, type JobGroup } from "./types";
import { UploadProofsDialog } from "./upload-proofs-dialog";

function formatJobStatus(status: ApiJob["status"]) {
  switch (status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "accepted":
      return "Accepted";
    case "pending":
      return "Pending";
  }
}

export function JobDetailView({ group, onBack }: { group: JobGroup; onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <Button variant="outline" onClick={onBack}>
        <ChevronLeft />
        Back to list
      </Button>

      <div className="flex items-center justify-between rounded-[12px] border border-card-line bg-white px-4 py-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        <div className="flex items-baseline gap-3">
          <span className="font-rubik text-[22px] leading-[26px] font-bold text-body">
            {group.customer}
          </span>
          <div className="flex items-baseline gap-1 font-rubik text-[14px] leading-[18px]">
            <span className="text-label">Job ID:</span>
            <span className="font-medium text-body">{group.invoiceNumber}</span>
          </div>
        </div>
        <ReverseJobDialog
          customer={group.customer}
          jobId={String(group.invoiceNumber)}
          jobIds={group.jobs.map((j) => j.id)}
          triggerClassName="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
          triggerContent={
            <>
              <ReverseIcon />
              Reverse all
            </>
          }
        />
      </div>

      <div className="overflow-hidden rounded-[12px] border border-card-line bg-white shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        <div className="grid grid-cols-[48px_1fr_120px_124px] border-b border-card-line">
          <span className="border-r border-card-line px-3 py-2 font-rubik text-[12px] leading-[14px] text-label">
            #
          </span>
          <span className="border-r border-card-line px-3 py-2 font-rubik text-[12px] leading-[14px] text-label">
            Description
          </span>
          <span className="border-r border-card-line px-3 py-2 font-rubik text-[12px] leading-[14px] text-label">
            Status
          </span>
          <span />
        </div>

        {group.jobs.map((job, idx) => (
          <div
            key={job.id}
            className={cn(
              "grid grid-cols-[48px_1fr_120px_124px] hover:bg-[#fafffa]",
              idx < group.jobs.length - 1 && "border-b border-card-line",
            )}
          >
            <span className="border-r border-card-line px-3 py-3 pt-3.5 font-rubik text-[14px] leading-[18px] text-body">
              {idx + 1}
            </span>

            <div className="flex flex-col gap-2 border-r border-card-line px-3 py-3">
              <div className="font-rubik text-[14px] leading-[18px] font-normal text-body">
                <p>{job.invoiceItem.vehicleSize}&quot; Rims</p>
                <p>
                  {job.invoiceItem.description}
                  {job.invoiceItem.damageLevel && `, Damage: ${job.invoiceItem.damageLevel}`}
                </p>
              </div>
              <div className="flex gap-1 font-rubik text-[14px] leading-[18px]">
                <span className="text-label">Comments:</span>
                <span className="text-body">{job.invoiceItem.comments}</span>
              </div>
              {job.technician && (
                <span className="inline-flex w-fit rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white">
                  {job.technician.name}
                </span>
              )}
            </div>

            <div className="flex items-center border-r border-card-line px-3 py-3">
              <span
                className={cn(
                  "rounded-[4px] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white",
                  job.status === "completed" ? "bg-[#55ce63]" : "bg-[#f9b62e]",
                )}
              >
                {formatJobStatus(job.status)}
              </span>
            </div>

            <div className="flex flex-col gap-2 px-3 py-3">
              {job.status === "accepted" && <UploadProofsDialog group={group} />}
              {job.status === "in_progress" && (
                <Button color="success">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path
                      d="M10 11.4787C10 11.4787 10.6667 11.6681 11 12.3347C11.3333 13.0014 11.7308 10.6681 12.672 10.3347M6.24579 6.66621C6.24579 4.38001 6.21334 2.8871 7.04808 2.09425C7.88275 1.30141 8.25145 1.33351 11.9491 1.33351C12.3064 1.33206 12.4863 1.74259 12.2336 1.98263L10.3298 3.79143C9.84654 4.25055 9.84521 4.99489 10.3285 5.45395C10.8118 5.91302 11.5954 5.91307 12.0788 5.45407L13.9831 3.6457C14.2358 3.40573 14.668 3.57656 14.6665 3.91597C14.6665 5.73892 14.6756 6.71003 14.5676 7.33333M6.24579 6.66621L1.91469 10.7811C1.13955 11.5174 1.13955 12.7113 1.91469 13.4478C2.68983 14.1841 3.94657 14.1841 4.7217 13.4478L6.66667 11.5997M6.24579 6.66621C6.24622 7.4625 6.61408 8.17779 7.19702 8.66667M3.44489 12H3.4386M14.6667 11.332C14.6667 13.1729 13.1743 14.6653 11.3333 14.6653C9.4924 14.6653 8 13.1729 8 11.332C8 9.49107 9.4924 7.99867 11.3333 7.99867C13.1743 7.99867 14.6667 9.49107 14.6667 11.332Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Done
                </Button>
              )}
              <ReverseJobDialog
                customer={group.customer}
                jobId={String(group.invoiceNumber)}
                jobIds={[job.id]}
                triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] font-rubik text-[12px] leading-[14px] transition-colors border border-[#db3e21] text-[#db3e21] hover:bg-[#db3e21]/5"
                triggerContent={
                  <>
                    <ReverseIcon />
                    Reverse
                  </>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
