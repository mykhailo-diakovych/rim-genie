import { AlertCircle, Moon, Recycle } from "lucide-react";

import { JobActionDialog } from "./job-action-dialog";
import type { ApiJob } from "./types";

function formatJobTypes(job: ApiJob): string {
  const types = job.invoiceItem.jobTypes as { type: string }[];
  if (!types.length) return "";
  const counts = new Map<string, number>();
  for (const t of types) {
    counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => `${count} x ${type}`)
    .join(", ");
}

export function OvernightJobCard({ job }: { job: ApiJob }) {
  const jobTypesStr = formatJobTypes(job);

  return (
    <div className="flex gap-4 rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <span className="font-rubik text-sm leading-[18px] font-medium text-body">
              {job.invoice.customer.name}
            </span>
            <span className="rounded-[4px] bg-[#243a5e] px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-[#ebf0ff]">
              Overnight
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-rubik text-xs leading-3.5">
            <span className="text-label">Job ID:</span>
            <span className="text-body">{job.invoice.invoiceNumber}</span>
          </div>
        </div>
        <div className="font-rubik text-sm leading-[18px] text-body">
          {job.invoiceItem.description && <p>{job.invoiceItem.description}</p>}
          {jobTypesStr && <p>{jobTypesStr}</p>}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <JobActionDialog job={job} action="pickup" trigger={<Recycle />} />
        <JobActionDialog job={job} action="overnight" trigger={<Moon />} />
        <JobActionDialog job={job} action="missing" trigger={<AlertCircle />} />
      </div>
    </div>
  );
}
