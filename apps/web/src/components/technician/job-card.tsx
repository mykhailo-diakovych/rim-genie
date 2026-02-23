import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CompleteJobDialog } from "./complete-job-dialog";
import { type JobGroup } from "./types";
import { UploadProofsDialog } from "./upload-proofs-dialog";
import { getGroupAction } from "./use-jobs";

export function JobCard({ group, onView }: { group: JobGroup; onView: () => void }) {
  const action = getGroupAction(group);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-4">
          <span className="font-rubik text-sm leading-4.5 font-medium text-body">
            {group.customer}
          </span>
          {group.assignee && (
            <span className="rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white">
              {group.assignee}
            </span>
          )}
        </div>
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

        {action === "done" ? (
          <CompleteJobDialog group={group} />
        ) : (
          <UploadProofsDialog group={group} />
        )}
      </div>
    </div>
  );
}
