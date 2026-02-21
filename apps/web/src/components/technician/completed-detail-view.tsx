import { ChevronLeft, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ReverseJobDialog } from "./reverse-job-dialog";
import { type JobGroup } from "./types";

export function CompletedDetailView({ group, onBack }: { group: JobGroup; onBack: () => void }) {
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
          triggerClassName="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
          triggerContent={
            <>
              <Undo2 className="size-4" />
              Reverse all
            </>
          }
        />
      </div>

      <div className="overflow-hidden rounded-[12px] border border-card-line bg-white shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        <div className="grid grid-cols-[48px_1fr_120px_124px] border-b border-card-line px-3 py-2">
          <span className="font-rubik text-[12px] leading-[14px] text-label">#</span>
          <span className="font-rubik text-[12px] leading-[14px] text-label">Description</span>
          <span className="font-rubik text-[12px] leading-[14px] text-label">Status</span>
          <span />
        </div>

        {group.jobs.map((job, idx) => (
          <div
            key={job.id}
            className={`grid grid-cols-[48px_1fr_120px_124px] items-start bg-[#fafffa] px-3 py-3${idx < group.jobs.length - 1 ? " border-b border-card-line" : ""}`}
          >
            <span className="pt-0.5 font-rubik text-[14px] leading-[18px] text-body">
              {idx + 1}
            </span>

            <div className="flex flex-col gap-1">
              <p className="font-rubik text-[14px] leading-[18px] font-medium text-body">
                {job.invoiceItem.vehicleSize}&quot; Rims
              </p>
              <p className="font-rubik text-[12px] leading-[14px] text-label">
                {job.invoiceItem.description}
                {job.invoiceItem.damageLevel && `, Damage: ${job.invoiceItem.damageLevel}`}
              </p>
              <p className="font-rubik text-[12px] leading-[14px] text-label">
                Comments: {job.invoiceItem.comments}
              </p>
              {job.technician && (
                <span className="mt-0.5 inline-flex w-fit rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white">
                  {job.technician.name}
                </span>
              )}
            </div>

            <div className="flex items-start pt-0.5">
              <span className="rounded-[4px] bg-[#55ce63] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white">
                Completed
              </span>
            </div>

            <div className="flex items-start pt-0.5">
              <ReverseJobDialog
                customer={group.customer}
                jobId={String(group.invoiceNumber)}
                triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
                triggerContent={
                  <>
                    <Undo2 className="size-4" />
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
