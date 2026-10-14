import { useState, type ReactNode } from "react";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconNight, IconPickup } from "@/components/ui/nav-icons";
import { RowActionsMenu, RowActionsMenuItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

import { EditNoteDialog, JobActionDialog } from "./job-action-dialog";
import type { JobAction, NoteType } from "./job-action-dialog";
import {
  formatInvoiceNumber,
  formatJobPosition,
  getInvoiceBalance,
  getInvoicePickupState,
} from "./invoice-pickup";
import { PickupDialog } from "./pickup-dialog";
import type { ApiJob, TabValue } from "./types";

function formatJobTypes(job: ApiJob): string {
  const types = (job.invoiceItem.jobTypes ?? []) as {
    type: string;
    subType?: string;
    input?: string;
  }[];
  if (!types.length) return "";
  const counts = new Map<string, number>();
  for (const t of types) {
    const label =
      t.subType ??
      t.type
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    const qty = Number.parseInt(t.input ?? "", 10) || 1;
    counts.set(label, (counts.get(label) ?? 0) + qty);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => `${count} x ${label}`)
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
  MISSING: "bg-error-100 text-red",
  OVERNIGHT: "bg-blue/10 text-blue",
  REVERSED: "bg-badge-orange/10 text-badge-orange",
};

function getStatusBadge(job: ApiJob): { label: string; className: string } {
  if (job.isPickedUp) return { label: "Picked Up", className: "bg-green/10 text-green" };
  if (job.isMissing) return { label: "Missing", className: "bg-error-100 text-red" };
  if (job.isOvernight)
    return { label: "Overnight", className: "bg-banner-navy text-banner-navy-foreground" };
  if (job.status === "completed") return { label: "Ready", className: "bg-blue/10 text-blue" };
  return { label: job.status, className: "bg-page text-label" };
}

const TAB_ACTIONS: Record<TabValue, { pickup: boolean; menu: JobAction[] }> = {
  overnight: { pickup: true, menu: ["missing"] },
  readyForPickup: { pickup: true, menu: ["overnight", "missing"] },
  outstandingBalance: { pickup: true, menu: ["overnight", "missing"] },
  missing: { pickup: true, menu: ["overnight"] },
  pickedUp: { pickup: false, menu: [] },
};

const MENU_ITEMS: Record<JobAction, { label: string; icon: ReactNode; destructive: boolean }> = {
  overnight: { label: "Mark as Overnight", icon: <IconNight />, destructive: false },
  missing: { label: "Mark as Missing", icon: <TriangleAlert />, destructive: true },
};

function availableActions(job: ApiJob, tab: TabValue) {
  return TAB_ACTIONS[tab].menu.filter((action) =>
    action === "overnight" ? !job.isOvernight : !job.isMissing,
  );
}

function InvoiceBalance({ invoice }: { invoice: ApiJob["invoice"] }) {
  const balance = getInvoiceBalance(invoice);

  return (
    <div className="grid grid-cols-2 rounded-lg bg-page p-3 font-rubik md:w-80">
      <div className="flex min-w-0 flex-col gap-1 pr-4">
        <span className="text-xs text-label">Total</span>
        <span className="truncate text-xl leading-7 font-semibold text-body tabular-nums">
          {formatCents(invoice.total)}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1 border-l border-field-line pl-4">
        <span className="text-xs text-label">Balance</span>
        <span
          className={cn(
            "truncate text-xl leading-7 font-semibold tabular-nums",
            balance > 0 ? "text-red" : "text-body",
          )}
        >
          {formatCents(balance)}
        </span>
      </div>
    </div>
  );
}

const cardClass =
  "flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card md:flex-row md:items-center md:gap-5 md:px-4";

const balanceColumnClass = "md:self-stretch md:border-l md:border-card-line md:pl-5";

function StatusBadge({ job }: { job: ApiJob }) {
  const badge = getStatusBadge(job);
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-rubik text-xs leading-3.5", badge.className)}>
      {badge.label}
    </span>
  );
}

function JobActionsMenu({ job, actions }: { job: ApiJob; actions: JobAction[] }) {
  const [openDialog, setOpenDialog] = useState<JobAction | null>(null);

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsMenu label="Job actions" className="size-9.5">
        {actions.map((action) => {
          const item = MENU_ITEMS[action];
          return (
            <RowActionsMenuItem
              key={action}
              destructive={item.destructive}
              onClick={() => setOpenDialog(action)}
            >
              {item.icon}
              {item.label}
            </RowActionsMenuItem>
          );
        })}
      </RowActionsMenu>
      {actions.map((action) => (
        <JobActionDialog
          key={action}
          job={job}
          action={action}
          open={openDialog === action}
          onOpenChange={(open) => setOpenDialog(open ? action : null)}
        />
      ))}
    </>
  );
}

function InvoicePickupAction({ invoice }: { invoice: ApiJob["invoice"] }) {
  const [open, setOpen] = useState(false);
  const { ready, completed, total } = getInvoicePickupState(invoice);

  return (
    <div className="flex flex-1 flex-col items-stretch gap-1 md:flex-none md:items-end">
      <Button variant="outline" color="success" disabled={!ready} onClick={() => setOpen(true)}>
        <IconPickup />
        Pickup
      </Button>
      {!ready && (
        <span className="font-rubik text-xs leading-3.5 text-label">
          {completed} of {total} jobs completed
        </span>
      )}
      {ready && <PickupDialog invoice={invoice} open={open} onOpenChange={setOpen} />}
    </div>
  );
}

function JobDetails({ job }: { job: ApiJob }) {
  const jobTypesStr = formatJobTypes(job);
  const notes = parseNotes(job.specialNotes);

  return (
    <>
      <div className="flex flex-col gap-1 font-rubik">
        {job.invoiceItem.description && (
          <p className="text-sm leading-4.5 text-body">{job.invoiceItem.description}</p>
        )}
        {jobTypesStr && <p className="text-xs leading-3.5 text-label">{jobTypesStr}</p>}
      </div>
      {notes.length > 0 && (
        <div className="flex flex-col gap-1">
          {notes.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 font-rubik text-xs leading-3.5">
              {entry.tag && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium",
                    TAG_STYLES[entry.tag] ?? "bg-page text-label",
                  )}
                >
                  {entry.tag}
                </span>
              )}
              {entry.text && <span className="text-label">{entry.text}</span>}
              {(entry.tag === "OVERNIGHT" || entry.tag === "MISSING") && (
                <EditNoteDialog
                  job={job}
                  noteType={entry.tag as NoteType}
                  initialNote={entry.text}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function InventoryJobCard({ job, tab }: { job: ApiJob; tab: TabValue }) {
  const actions = availableActions(job, tab);

  return (
    <div className={cardClass}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-rubik text-base leading-5 font-medium text-body">
              {job.invoice.customer.name}
            </span>
            <StatusBadge job={job} />
          </div>
          <span className="font-rubik text-xs leading-3.5 text-label">
            Job ID: {job.invoice.invoiceNumber}
          </span>
        </div>
        <JobDetails job={job} />
      </div>

      <div className={cn("flex items-center", balanceColumnClass)}>
        <InvoiceBalance invoice={job.invoice} />
      </div>

      {(TAB_ACTIONS[tab].pickup || actions.length > 0) && (
        <div className="flex items-start gap-2">
          {TAB_ACTIONS[tab].pickup && <InvoicePickupAction invoice={job.invoice} />}
          <JobActionsMenu job={job} actions={actions} />
        </div>
      )}
    </div>
  );
}

// Ready For Pickup lists invoices, not jobs: the customer signs once for all of them.
export function InventoryInvoiceCard({ jobs, tab }: { jobs: ApiJob[]; tab: TabValue }) {
  const invoice = jobs[0]!.invoice;

  return (
    <div className={cardClass}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-rubik text-base leading-5 font-medium text-body">
            {invoice.customer.name}
          </span>
          <span className="font-rubik text-xs leading-3.5 text-label">
            {formatInvoiceNumber(invoice.invoiceNumber)} · {invoice.jobs.length}{" "}
            {invoice.jobs.length === 1 ? "job" : "jobs"}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-card-line">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-rubik text-xs leading-3.5 font-medium text-label">
                    {formatJobPosition(job)}
                  </span>
                  <StatusBadge job={job} />
                </div>
                <JobDetails job={job} />
              </div>
              <JobActionsMenu job={job} actions={availableActions(job, tab)} />
            </div>
          ))}
        </div>
      </div>

      <div className={cn("flex items-center", balanceColumnClass)}>
        <InvoiceBalance invoice={invoice} />
      </div>

      <div className="flex items-start gap-2">
        <InvoicePickupAction invoice={invoice} />
      </div>
    </div>
  );
}

export function InventoryJobCardSkeleton() {
  return (
    <div className={cardClass}>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-64 max-w-full rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>
      <div className={balanceColumnClass}>
        <Skeleton className="h-20 w-full rounded-lg md:w-80" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9.5 w-24 rounded-md" />
        <Skeleton className="size-9.5 rounded-md" />
      </div>
    </div>
  );
}
