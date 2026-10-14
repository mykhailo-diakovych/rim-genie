import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import type { AppRouterClient } from "@rim-genie/api/routers/index";

import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { JobProofsSection, jobProofLabel } from "@/components/technician/job-proofs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { orpc } from "@/utils/orpc";

type InvoiceJob = Awaited<ReturnType<AppRouterClient["jobs"]["getByInvoice"]>>["jobs"][number];

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-1 font-rubik text-xs leading-3.5">
      <span className="text-label">{label}:</span>
      <span className="text-body">{value}</span>
    </div>
  );
}

function JobTimeline({ job }: { job: InvoiceJob }) {
  const pickup = job.pickup;
  return (
    <div className="flex flex-col gap-1.5">
      <TimelineRow label="Created" value={formatDateTime(job.createdAt)} />
      {job.acceptedAt && <TimelineRow label="Accepted" value={formatDateTime(job.acceptedAt)} />}
      {job.startedAt && <TimelineRow label="Started" value={formatDateTime(job.startedAt)} />}
      {job.completedAt && <TimelineRow label="Completed" value={formatDateTime(job.completedAt)} />}
      {job.dueDate && <TimelineRow label="Due" value={formatDateTime(job.dueDate)} />}
      {pickup ? (
        <TimelineRow
          label="Picked up"
          value={`${formatDateTime(pickup.pickedUpAt)} by ${pickup.pickedUpBy.name}`}
        />
      ) : (
        job.isPickedUp && <TimelineRow label="Picked up" value="Yes" />
      )}
    </div>
  );
}

function JobItem({
  job,
  invoiceId,
  customer,
  invoiceNumber,
}: {
  job: InvoiceJob;
  invoiceId: string;
  customer: string;
  invoiceNumber: number;
}) {
  const item = job.invoiceItem;
  return (
    <div className="flex flex-col gap-1 font-rubik text-sm leading-4.5">
      {item.itemType === "rim" && item.vehicleSize && (
        <p className="font-medium text-body">
          {item.vehicleSize}&quot; Rims{item.quantity > 1 && ` × ${item.quantity}`}
        </p>
      )}
      <p className="text-body">
        {item.description ?? "—"}
        {item.damageLevel && `, Damage: ${item.damageLevel}`}
      </p>
      {item.comments && (
        <p className="text-xs leading-3.5">
          <span className="text-label">Comments: </span>
          <span className="text-body">{item.comments}</span>
        </p>
      )}
      {job.specialNotes && (
        <p className="text-xs leading-3.5">
          <span className="text-label">Notes: </span>
          <span className="text-body">{job.specialNotes}</span>
        </p>
      )}
      {job.pickup?.notes && (
        <p className="text-xs leading-3.5">
          <span className="text-label">Pickup notes: </span>
          <span className="text-body">{job.pickup.notes}</span>
        </p>
      )}
      {job.isOvernight && (
        <span className="inline-flex w-fit rounded bg-badge-magenta px-1.5 py-0.5 text-xs leading-3.5 text-white">
          Overnight
        </span>
      )}
      <div className="mt-2">
        <JobProofsSection
          invoiceId={invoiceId}
          customer={customer}
          invoiceNumber={invoiceNumber}
          jobLabel={jobProofLabel(item)}
        />
      </div>
    </div>
  );
}

const ROW_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-[40px_1fr_140px_104px_240px]";

export function CustomerJobView({
  customerId,
  invoiceId,
}: {
  customerId: string;
  invoiceId: string;
}) {
  const { data, isLoading } = useQuery(
    orpc.jobs.getByInvoice.queryOptions({ input: { invoiceId } }),
  );

  const found = data && data.customer.id === customerId ? data : null;

  return (
    <div className="flex flex-1 flex-col gap-3 p-3 sm:p-5">
      <StickyActionBar>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/customers/$customerId" params={{ customerId }} />}
        >
          <ChevronLeft />
          Back to customer
        </Button>
      </StickyActionBar>

      {isLoading ? (
        <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card">
          <Skeleton className="h-6.5 w-56" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !found ? (
        <div className="rounded-xl border border-card-line bg-white p-3 shadow-card">
          <p className="py-4 text-center font-rubik text-sm text-label">Job not found</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-card-line bg-white px-4 py-3 shadow-card">
            <h1 className="font-rubik text-[22px] leading-6.5 font-bold text-body">
              {found.customer.name}
            </h1>
            <div className="flex items-baseline gap-1 font-rubik text-sm leading-4.5">
              <span className="text-label">Job ID:</span>
              <span className="font-medium text-body">{found.invoiceNumber}</span>
            </div>
            <div className="flex items-baseline gap-1 font-rubik text-sm leading-4.5">
              <span className="text-label">Created:</span>
              <span className="text-body">{formatDateTime(found.createdAt)}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
            <div
              className={`${ROW_GRID} hidden border-b border-card-line px-3 py-2 font-rubik text-xs leading-3.5 text-label sm:grid`}
            >
              <span>#</span>
              <span>Description</span>
              <span>Technician</span>
              <span>Status</span>
              <span>Timeline</span>
            </div>

            {found.jobs.length === 0 && (
              <p className="py-6 text-center font-rubik text-sm text-label">No jobs yet</p>
            )}

            {found.jobs.map((job, idx) => (
              <div
                key={job.id}
                className={`${ROW_GRID} px-3 py-3${idx < found.jobs.length - 1 ? " border-b border-card-line" : ""}`}
              >
                <span className="hidden font-rubik text-sm leading-4.5 text-body sm:block">
                  {idx + 1}
                </span>
                <JobItem
                  job={job}
                  invoiceId={invoiceId}
                  customer={found.customer.name}
                  invoiceNumber={found.invoiceNumber}
                />
                <div className="flex flex-col gap-1 font-rubik text-sm leading-4.5">
                  <span className="text-xs leading-3.5 text-label sm:hidden">Technician</span>
                  <span className="text-body">{job.technician?.name ?? "Unassigned"}</span>
                </div>
                <div>
                  <StatusBadge status={job.status} />
                </div>
                <JobTimeline job={job} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
