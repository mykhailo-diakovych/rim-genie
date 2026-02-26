import { ChevronLeft, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ReverseJobDialog } from "./reverse-job-dialog";
import { type JobGroup } from "./types";

export function CompletedDetailView({ group, onBack }: { group: JobGroup; onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <Button variant="outline" className="self-start" onClick={onBack}>
        <ChevronLeft />
        Back to list
      </Button>

      <div className="flex items-center justify-between rounded-xl border border-card-line bg-white px-4 py-3 shadow-card">
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
          jobIds={group.jobs.map((j) => j.id)}
          technicianId={group.jobs[0]!.technician!.id}
          triggerClassName="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-md border border-[#db3e21] font-rubik text-xs leading-3.5 text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
          triggerContent={
            <>
              <Undo2 className="size-4" />
              Reverse all
            </>
          }
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
        <div className="grid grid-cols-[48px_1fr_120px_124px] border-b border-card-line px-3 py-2">
          <span className="font-rubik text-xs leading-3.5 text-label">#</span>
          <span className="font-rubik text-xs leading-3.5 text-label">Description</span>
          <span className="font-rubik text-xs leading-3.5 text-label">Status</span>
          <span />
        </div>

        {group.jobs.map((job, idx) => (
          <div
            key={job.id}
            className={`grid grid-cols-[48px_1fr_120px_124px] items-start bg-[#fafffa] px-3 py-3${idx < group.jobs.length - 1 ? " border-b border-card-line" : ""}`}
          >
            <span className="pt-0.5 font-rubik text-sm leading-4.5 text-body">{idx + 1}</span>

            <div className="flex flex-col gap-1">
              <p className="font-rubik text-sm leading-4.5 font-medium text-body">
                {job.invoiceItem.vehicleSize}&quot; Rims
              </p>
              <p className="font-rubik text-xs leading-3.5 text-label">
                {job.invoiceItem.description}
                {job.invoiceItem.damageLevel && `, Damage: ${job.invoiceItem.damageLevel}`}
              </p>
              <p className="font-rubik text-xs leading-3.5 text-label">
                Comments: {job.invoiceItem.comments}
              </p>
              {job.technician && (
                <span className="mt-0.5 inline-flex w-fit rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white">
                  {job.technician.name}
                </span>
              )}
            </div>

            <div className="flex items-start pt-0.5">
              <span className="rounded-[4px] bg-[#55ce63] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white">
                Completed
              </span>
            </div>

            <div className="flex items-start pt-0.5">
              {job.technician && (
                <ReverseJobDialog
                  customer={group.customer}
                  jobId={String(group.invoiceNumber)}
                  jobIds={[job.id]}
                  technicianId={job.technician.id}
                  triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-md border border-[#db3e21] font-rubik text-xs leading-3.5 text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
                  triggerContent={
                    <>
                      <Undo2 className="size-4" />
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
