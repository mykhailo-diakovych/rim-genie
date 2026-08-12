import type { JobGroup } from "./types";


export function PartialInvoiceNote({ group }: { group: JobGroup }) {
  const shown = group.jobs.length;
  if (group.totalJobs <= shown) return null;

  return (
    <span className="rounded bg-page px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-label">
      {shown} of {group.totalJobs} jobs
    </span>
  );
}
