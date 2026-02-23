import { Eye, SquareCheckBig } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AcceptJobDialog } from "./accept-job-dialog";
import { type JobGroup } from "./types";

export function AssignJobCard({ group, onView }: { group: JobGroup; onView: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-rubik text-sm leading-4.5 font-medium text-body">
          {group.customer}
        </span>
        <div className="flex items-center gap-2 font-rubik text-xs leading-3.5">
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
          triggerClassName="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-md border border-green font-rubik text-xs leading-3.5 text-green transition-colors hover:bg-green/5"
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
