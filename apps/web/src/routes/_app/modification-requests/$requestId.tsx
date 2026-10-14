import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { toast } from "sonner";

import { lineQuantityLabel, lineTotalCents } from "@rim-genie/db/line-item";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format-currency";
import { requireRoles } from "@/lib/route-permissions";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/modification-requests/$requestId")({
  beforeLoad: requireRoles(["admin"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Invoice Modification" }],
  }),
  component: ModificationRequestPage,
});

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-amber-100 text-amber-700", label: "Pending" },
  approved: { className: "bg-emerald-100 text-emerald-700", label: "Approved" },
  rejected: { className: "bg-red-100 text-red-700", label: "Declined" },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-rubik text-xs text-label">{label}</p>
      <p className="mt-0.5 font-rubik text-sm text-body">{value}</p>
    </div>
  );
}

function ModificationRequestPage() {
  const { requestId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: request, isLoading } = useQuery(
    orpc.invoiceModification.get.queryOptions({ input: { id: requestId } }),
  );

  const respond = useMutation({
    ...orpc.invoiceModification.respond.mutationOptions(),
    onSuccess: async (_, { approve }) => {
      await queryClient.invalidateQueries();
      toast.success(
        approve
          ? "Modification approved. The invoice has been returned to the Floor queue."
          : "Modification request declined",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inv = request?.invoice;
  const status = request ? (STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending!) : null;

  return (
    <div className="flex flex-1 items-start justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl">
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-3 bg-white py-2">
          <Button
            nativeButton={false}
            render={<Link to="/dashboard" />}
            variant="ghost"
            className="size-9 p-0"
          >
            <ArrowLeft />
          </Button>
          <h1 className="font-rubik text-lg font-semibold text-body">
            Request Invoice Modification
          </h1>
          {status && (
            <span
              className={`rounded-full px-2.5 py-0.5 font-rubik text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
          )}
        </div>

        <div className="min-h-96 rounded-xl border border-card-line bg-white shadow-card">
          {isLoading ? (
            <div className="flex flex-col gap-4 p-5">
              <div className="h-6 w-40 animate-pulse rounded bg-page" />
              <div className="h-24 animate-pulse rounded-md bg-page" />
              <div className="h-32 animate-pulse rounded-md bg-page" />
            </div>
          ) : !request || !inv ? (
            <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-5">
              <FilePenLine className="size-10 text-ghost" />
              <p className="font-rubik text-sm text-label">Modification request not found.</p>
              <Button nativeButton={false} render={<Link to="/dashboard" />} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-rubik text-base font-medium text-body">
                  Invoice #{inv.invoiceNumber}
                </p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/cashier/$invoiceId" params={{ invoiceId: inv.id }} />}
                >
                  View Invoice
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <InfoField label="Customer" value={inv.customer?.name ?? "—"} />
                <InfoField label="Invoice Total" value={formatCents(inv.total)} />
                <InfoField label="Amount Paid" value={formatCents(inv.paid)} />
                <InfoField label="Outstanding Balance" value={formatCents(inv.total - inv.paid)} />
                <InfoField label="Requested By" value={request.requestedBy?.name ?? "Unknown"} />
                <InfoField label="Requested On" value={formatDate(request.createdAt)} />
                <InfoField
                  label="Assigned Admin"
                  value={request.assignedAdmin?.name ?? "Unknown"}
                />
              </div>

              <div className="mt-4 rounded-md bg-page p-3">
                <p className="font-rubik text-xs text-label">Reason for Modification</p>
                <p className="mt-1 font-rubik text-sm whitespace-pre-wrap text-body">
                  {request.reason || "No reason provided"}
                </p>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] font-rubik text-xs">
                  <thead>
                    <tr className="border-t border-b border-field-line text-left text-label">
                      <th className="border-l border-field-line px-2 py-2 font-normal">
                        Description
                      </th>
                      <th className="w-18 border-l border-field-line px-2 py-2 font-normal">
                        Quantity
                      </th>
                      <th className="w-28 border-l border-field-line px-2 py-2 font-normal">
                        Unit Cost
                      </th>
                      <th className="w-28 border-r border-l border-field-line px-2 py-2 font-normal">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item) => (
                      <tr key={item.id} className="border-b border-field-line">
                        <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                          {item.description ?? "Rim Job"}
                        </td>
                        <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                          {lineQuantityLabel(item)}
                        </td>
                        <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                          {formatCents(item.unitCost)}
                        </td>
                        <td className="border-r border-l border-field-line px-2 py-2 text-sm text-body">
                          {formatCents(lineTotalCents(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="my-4 h-px bg-field-line" />

              {request.canRespond ? (
                <div className="flex flex-col gap-3">
                  <p className="font-rubik text-sm font-medium text-body">Approve Modification</p>
                  <p className="font-rubik text-base text-body">Do you approve this request?</p>
                  <div className="flex gap-2">
                    <Button
                      color="success"
                      className="flex-1"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: requestId, approve: true })}
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      color="destructive"
                      className="flex-1"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: requestId, approve: false })}
                    >
                      No
                    </Button>
                  </div>
                </div>
              ) : request.status === "pending" ? (
                <p className="font-rubik text-sm text-label">
                  Only {request.assignedAdmin?.name ?? "the assigned admin"} can respond to this
                  request.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoField
                    label="Decision"
                    value={request.status === "approved" ? "Approved" : "Declined"}
                  />
                  <InfoField label="Resolved By" value={request.resolvedBy?.name ?? "Unknown"} />
                  <InfoField label="Resolved On" value={formatDate(request.resolvedAt)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
