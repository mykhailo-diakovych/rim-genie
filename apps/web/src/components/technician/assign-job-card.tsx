import { Eye, SquareCheckBig } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AcceptJobDialog } from "./accept-job-dialog";
import { type JobGroup } from "./types";

export function AssignJobCard({ group, onView }: { group: JobGroup; onView: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
          {group.customer}
        </span>
        <div className="flex items-center gap-2 font-rubik text-[12px] leading-[14px]">
          <span className="text-label">Job ID:</span>
          <span className="text-body">{group.invoiceNumber}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Date:</span>
          <span className="text-body">{group.date}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button onClick={onView}>
          <Eye />
          View
        </Button>
        <AcceptJobDialog
          customer={group.customer}
          jobId={String(group.invoiceNumber)}
          jobIds={group.jobs.filter((j) => j.status === "pending").map((j) => j.id)}
          triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] border border-green font-rubik text-[12px] leading-[14px] text-green transition-colors hover:bg-green/5"
          triggerContent={
            <>
              <SquareCheckBig className="size-4" />
              Accept
            </>
          }
        />
      </div>
    </div>
  );
}
