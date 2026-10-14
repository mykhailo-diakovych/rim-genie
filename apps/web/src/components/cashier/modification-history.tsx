import { useQuery } from "@tanstack/react-query";

import type { InvoiceLineChange } from "@rim-genie/db/schema";

import { formatCents } from "@/lib/format-currency";
import { orpc } from "@/utils/orpc";

const STATUS_LABELS: Record<string, string> = {
  completed: "Sent to Cashier",
  finalized: "Finalized",
  pending_finalization: "Pending Finalization",
};

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeChange(change: InvoiceLineChange) {
  if (change.kind === "added") {
    return `Added: ${change.after.description} (${change.after.quantity} × ${formatCents(change.after.unitCost)})`;
  }
  if (change.kind === "removed") {
    return `Removed: ${change.before.description} (${formatCents(change.before.total)})`;
  }
  return `Changed: ${change.after.description} — ${change.before.quantity} × ${formatCents(change.before.unitCost)} → ${change.after.quantity} × ${formatCents(change.after.unitCost)}`;
}

export function ModificationHistory({ invoiceId }: { invoiceId: string }) {
  const { data: events } = useQuery(
    orpc.invoiceModification.history.queryOptions({ input: { invoiceId } }),
  );

  if (!events || events.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-card-line bg-white p-3 shadow-card print:hidden">
      <h3 className="mb-2 font-rubik text-base font-medium text-body">Modification History</h3>
      <ol className="flex flex-col">
        {events.map((event) => {
          const actor = event.actor?.name ?? "Unknown";
          const request = event.modificationRequest;
          const title = {
            modification_requested: `Modification requested by ${actor}`,
            modification_approved: `Modification approved by ${actor}`,
            modification_rejected: `Modification declined by ${actor}`,
            refinalized: `Re-finalized by ${actor}`,
            sent_to_cashier: `Sent to Cashier by ${actor}`,
          }[event.type];
          const details = event.details;

          return (
            <li
              key={event.id}
              className="flex flex-col gap-0.5 border-b border-field-line py-2 font-rubik last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm text-body">{title}</span>
                <span className="text-xs text-label">{formatDateTime(event.createdAt)}</span>
              </div>
              {event.type === "modification_requested" && request && (
                <span className="text-xs text-label">
                  Assigned to {request.assignedAdmin?.name ?? "Unknown"} · Reason:{" "}
                  {request.reason || "No reason provided"}
                </span>
              )}
              {event.fromStatus && event.toStatus && (
                <span className="text-xs text-label">
                  Status: {STATUS_LABELS[event.fromStatus] ?? event.fromStatus} →{" "}
                  {STATUS_LABELS[event.toStatus] ?? event.toStatus}
                </span>
              )}
              {event.type === "sent_to_cashier" && details && (
                <>
                  {details.previousTotal !== undefined && details.newTotal !== undefined && (
                    <span className="text-xs text-label">
                      Total: {formatCents(details.previousTotal)} → {formatCents(details.newTotal)}
                    </span>
                  )}
                  {(details.changes ?? []).map((change, i) => (
                    <span key={i} className="text-xs text-body">
                      {describeChange(change)}
                    </span>
                  ))}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
