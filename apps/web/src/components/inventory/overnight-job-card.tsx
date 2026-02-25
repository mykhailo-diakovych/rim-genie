import { IconMissing, IconNight, IconPickup } from "@/components/ui/nav-icons";

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

function parseNotes(specialNotes: string | null): { tag: string; text: string }[] {
  if (!specialNotes) return [];
  return specialNotes
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(\w+)](?::\s*(.*))?$/);
      if (match) return { tag: match[1]!, text: match[2] ?? "" };
      return { tag: "", text: line };
    });
}

const TAG_STYLES: Record<string, string> = {
  MISSING: "bg-[#fee4e2] text-[#d92d20]",
  OVERNIGHT: "bg-[#e0f2fe] text-[#0369a1]",
  REVERSED: "bg-[#fef3c7] text-[#92400e]",
};

export function OvernightJobCard({ job }: { job: ApiJob }) {
  const jobTypesStr = formatJobTypes(job);
  const notes = parseNotes(job.specialNotes);

  return (
    <div className="flex gap-4 rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <span className="font-rubik text-sm leading-4.5 font-medium text-body">
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
        <div className="font-rubik text-sm leading-4.5 text-body">
          {job.invoiceItem.description && <p>{job.invoiceItem.description}</p>}
          {jobTypesStr && <p>{jobTypesStr}</p>}
        </div>
        {notes.length > 0 && (
          <div className="flex flex-col gap-1">
            {notes.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 font-rubik text-xs leading-3.5">
                {entry.tag && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium ${TAG_STYLES[entry.tag] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {entry.tag}
                  </span>
                )}
                {entry.text && <span className="text-label">{entry.text}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <JobActionDialog job={job} action="pickup" trigger={<IconPickup />} />
        <JobActionDialog job={job} action="overnight" trigger={<IconNight />} />
        <JobActionDialog job={job} action="missing" trigger={<IconMissing />} />
      </div>
    </div>
  );
}
