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
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { cn } from "@/lib/utils";

import { CompleteJobDialog } from "./complete-job-dialog";
import { ReverseJobDialog } from "./reverse-job-dialog";
import { type ApiJob, type JobGroup } from "./types";
import { UploadProofsDialog } from "./upload-proofs-dialog";
import { isCompletable } from "./use-jobs";

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
    <div className="flex flex-1 flex-col gap-5 p-3 sm:p-5">
      <StickyActionBar>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft />
          Back to list
        </Button>
      </StickyActionBar>

      <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-rubik text-[22px] leading-6.5 font-bold text-body">
            {group.customer}
          </span>
          <div className="flex items-baseline gap-1 font-rubik text-sm leading-4.5">
            <span className="text-label">Job ID:</span>
            <span className="font-medium text-body">{group.invoiceNumber}</span>
          </div>
        </div>
        <ReverseJobDialog
          customer={group.customer}
          jobId={String(group.invoiceNumber)}
          jobIds={group.jobs.filter((j) => j.status !== "pending").map((j) => j.id)}
          technicianId={group.jobs[0]!.technician!.id}
          triggerClassName="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-md border border-[#db3e21] font-rubik text-xs leading-3.5 text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
          triggerContent={
            <>
              <ReverseIcon />
              Reverse all
            </>
          }
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
        <div className="grid grid-cols-[1fr_auto] border-b border-card-line sm:grid-cols-[48px_1fr_120px_124px]">
          <span className="hidden border-r border-card-line px-3 py-2 font-rubik text-xs leading-3.5 text-label sm:block">
            #
          </span>
          <span className="border-r border-card-line px-3 py-2 font-rubik text-xs leading-3.5 text-label">
            Description
          </span>
          <span className="hidden border-r border-card-line px-3 py-2 font-rubik text-xs leading-3.5 text-label sm:block">
            Status
          </span>
          <span />
        </div>

        {group.jobs.map((job, idx) => (
          <div
            key={job.id}
            className={cn(
              "grid grid-cols-[1fr_auto] hover:bg-[#fafffa] sm:grid-cols-[48px_1fr_120px_124px]",
              idx < group.jobs.length - 1 && "border-b border-card-line",
            )}
          >
            <span className="hidden border-r border-card-line px-3 py-3 pt-3.5 font-rubik text-sm leading-4.5 text-body sm:block">
              {idx + 1}
            </span>

            <div className="flex flex-col gap-2 border-r border-card-line px-3 py-3">
              <div className="mb-1 flex items-center gap-2 font-rubik text-xs leading-3.5 sm:hidden">
                <span className="text-label">#{idx + 1}</span>
                <span
                  className={cn(
                    "rounded-[4px] px-1.5 py-0.5 text-white",
                    job.status === "completed" ? "bg-[#55ce63]" : "bg-[#f9b62e]",
                  )}
                >
                  {formatJobStatus(job.status)}
                </span>
              </div>
              <div className="font-rubik text-sm leading-4.5 font-normal text-body">
                <p>{job.invoiceItem.vehicleSize}&quot; Rims</p>
                <p>
                  {job.invoiceItem.description}
                  {job.invoiceItem.damageLevel && `, Damage: ${job.invoiceItem.damageLevel}`}
                </p>
              </div>
              <div className="flex gap-1 font-rubik text-sm leading-4.5">
                <span className="text-label">Comments:</span>
                <span className="text-body">{job.invoiceItem.comments}</span>
              </div>
              {job.technician && (
                <span className="inline-flex w-fit rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white">
                  {job.technician.name}
                </span>
              )}
            </div>

            <div className="hidden items-center border-r border-card-line px-3 py-3 sm:flex">
              <span
                className={cn(
                  "rounded-[4px] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white",
                  job.status === "completed" ? "bg-[#55ce63]" : "bg-[#f9b62e]",
                )}
              >
                {formatJobStatus(job.status)}
              </span>
            </div>

            <div className="flex flex-col gap-2 px-3 py-3">
              {job.status === "accepted" && <UploadProofsDialog group={group} />}
              {/* Was a bare <Button> with no handler, gated on "in_progress" — a status
                  nothing in the app ever sets, so it never even rendered. Now a working
                  PIN-confirmed completion for whichever jobs are actually finishable. */}
              {isCompletable(job) && <CompleteJobDialog group={group} jobIds={[job.id]} />}
              {job.status !== "pending" && job.technician && (
                <ReverseJobDialog
                  customer={group.customer}
                  jobId={String(group.invoiceNumber)}
                  jobIds={[job.id]}
                  technicianId={job.technician.id}
                  triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-md font-rubik text-xs leading-3.5 transition-colors border border-[#db3e21] text-[#db3e21] hover:bg-[#db3e21]/5"
                  triggerContent={
                    <>
                      <ReverseIcon />
                      Reverse
                    </>
                  }
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
