import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Percent, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format-currency";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/discount-approvals/$requestId")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Discount Approval" }],
  }),
  component: DiscountApprovalPage,
});

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DiscountApprovalPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [overrideMode, setOverrideMode] = useState(false);
  const [overridePercent, setOverridePercent] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const { data: request, isLoading } = useQuery(
    orpc.discount.get.queryOptions({ input: { id: requestId } }),
  );

  const approveMutation = useMutation({
    mutationFn: (approvedPercent?: number) =>
      client.discount.approve({
        id: requestId,
        approvedPercent,
        adminNote: adminNote || undefined,
      }),
    onSuccess: () => {
      toast.success("Discount approved");
      void queryClient.invalidateQueries();
      navigateBack();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      client.discount.reject({
        id: requestId,
        adminNote: adminNote || undefined,
      }),
    onSuccess: () => {
      toast.success("Discount rejected");
      void queryClient.invalidateQueries();
      navigateBack();
    },
  });

  function navigateBack() {
    if (!request) {
      void navigate({ to: "/dashboard" });
      return;
    }
    if (request.type === "quote" && request.quoteId) {
      void navigate({ to: "/floor/$quoteId", params: { quoteId: request.quoteId } });
    } else if (request.type === "customer" && request.customerId) {
      void navigate({ to: "/customers/$customerId", params: { customerId: request.customerId } });
    } else {
      void navigate({ to: "/dashboard" });
    }
  }

  const isPending = request?.status === "pending";
  const isQuote = request?.type === "quote";
  const targetName = isQuote
    ? `Quote #${request?.quote?.quoteNumber}`
    : (request?.customer?.name ?? "Customer");

  const previewAmount =
    isQuote && request?.quote
      ? Math.round((request.quote.subtotal * request.requestedPercent) / 100)
      : null;

  return (
    <div className="flex flex-1 items-start justify-center p-3 sm:p-5">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Button
            nativeButton={false}
            render={<Link to="/dashboard" />}
            variant="ghost"
            className="size-9 p-0"
          >
            <ArrowLeft />
          </Button>
          <h1 className="font-rubik text-lg font-semibold text-body">Discount Approval</h1>
          {request && <StatusBadge status={request.status} />}
        </div>

        {/* Content card — fixed min-height so loading/empty/loaded don't jump */}
        <div className="min-h-96 rounded-xl border border-card-line bg-white shadow-card">
          {isLoading ? (
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 animate-pulse rounded-full bg-page" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-32 animate-pulse rounded bg-page" />
                  <div className="h-3 w-24 animate-pulse rounded bg-page" />
                </div>
              </div>
              <div className="h-px bg-field-line" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="h-3 w-20 animate-pulse rounded bg-page" />
                    <div className="h-4 w-28 animate-pulse rounded bg-page" />
                  </div>
                ))}
              </div>
              <div className="h-px bg-field-line" />
              <div className="h-16 animate-pulse rounded-md bg-page" />
              <div className="flex gap-2">
                <div className="h-9 flex-1 animate-pulse rounded-lg bg-page" />
                <div className="h-9 flex-1 animate-pulse rounded-lg bg-page" />
              </div>
            </div>
          ) : !request ? (
            <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-5">
              <Percent className="size-10 text-ghost" />
              <p className="font-rubik text-sm text-label">Discount request not found.</p>
              <Button nativeButton={false} render={<Link to="/dashboard" />} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col p-5">
              {/* Target info */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue/10">
                  <Percent className="size-5 text-blue" />
                </div>
                <div>
                  <p className="font-rubik text-sm font-medium text-body">{targetName}</p>
                  <p className="font-rubik text-xs text-label">
                    {isQuote ? "Quote Discount" : "Customer Default Discount"}
                  </p>
                </div>
              </div>

              <div className="my-4 h-px bg-field-line" />

              {/* Details grid — always 2 cols, consistent rows */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InfoField label="Requested By" value={request.requestedBy?.name ?? "Unknown"} />
                <InfoField label="Requested On" value={formatDate(request.createdAt)} />
                <InfoField label="Requested Discount" value={`${request.requestedPercent}%`} />
                {isQuote && request.quote ? (
                  <InfoField label="Quote Subtotal" value={formatCents(request.quote.subtotal)} />
                ) : (
                  <InfoField
                    label="Current Discount"
                    value={request.customer?.discount ? `${request.customer.discount}%` : "None"}
                  />
                )}
                {previewAmount !== null && (
                  <>
                    <InfoField label="Discount Amount" value={formatCents(previewAmount)} />
                    <InfoField
                      label="New Total"
                      value={formatCents(request.quote!.subtotal - previewAmount)}
                    />
                  </>
                )}
                {isQuote && request.quote?.customer && (
                  <InfoField label="Customer" value={request.quote.customer.name} />
                )}
              </div>

              {request.reason && (
                <>
                  <div className="my-4 h-px bg-field-line" />
                  <div className="rounded-md bg-page p-3">
                    <p className="font-rubik text-xs text-label">Reason</p>
                    <p className="mt-1 font-rubik text-sm text-body">{request.reason}</p>
                  </div>
                </>
              )}

              <div className="my-4 h-px bg-field-line" />

              {/* Action / Resolution section — always present, fixed layout */}
              {isPending ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block font-rubik text-xs text-label">
                      Admin Note (optional)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full resize-none rounded-md border border-field-line bg-input px-3 py-2 font-rubik text-sm text-body placeholder:text-ghost focus:border-blue focus:outline-none"
                      rows={2}
                    />
                  </div>

                  {overrideMode && (
                    <div>
                      <label className="mb-1 block font-rubik text-xs text-label">
                        Override Discount %
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={overridePercent}
                        onChange={(e) => setOverridePercent(e.target.value)}
                        className="w-full rounded-md border border-field-line bg-input px-3 py-2 font-rubik text-sm text-body focus:border-blue focus:outline-none"
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      color="success"
                      className="flex-1"
                      onClick={() => {
                        if (overrideMode) {
                          const parsed = Number(overridePercent);
                          if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
                            toast.error("Please enter a valid discount percentage (0-100)");
                            return;
                          }
                          approveMutation.mutate(parsed);
                        } else {
                          approveMutation.mutate(undefined);
                        }
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <ThumbsUp />
                      {overrideMode ? "Approve Override" : `Approve ${request.requestedPercent}%`}
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setOverrideMode(!overrideMode)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <Percent />
                      {overrideMode ? "Cancel" : "Override"}
                    </Button>

                    <Button
                      color="destructive"
                      className="flex-1"
                      onClick={() => rejectMutation.mutate()}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <ThumbsDown />
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="font-rubik text-sm font-medium text-body">Resolution</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoField
                      label="Status"
                      value={request.status === "approved" ? "Approved" : "Rejected"}
                    />
                    <InfoField label="Resolved By" value={request.resolvedBy?.name ?? "Unknown"} />
                    <InfoField label="Resolved On" value={formatDate(request.resolvedAt)} />
                    {request.approvedPercent !== null && (
                      <InfoField label="Approved Discount" value={`${request.approvedPercent}%`} />
                    )}
                  </div>
                  {request.adminNote && (
                    <div className="rounded-md bg-page p-3">
                      <p className="font-rubik text-xs text-label">Admin Note</p>
                      <p className="mt-1 font-rubik text-sm text-body">{request.adminNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: "bg-amber-100 text-amber-700", label: "Pending" },
    approved: { className: "bg-emerald-100 text-emerald-700", label: "Approved" },
    rejected: { className: "bg-red-100 text-red-700", label: "Rejected" },
  };
  const c = config[status] ?? config.pending!;
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-rubik text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-rubik text-xs text-label">{label}</p>
      <p className="mt-0.5 font-rubik text-sm text-body">{value}</p>
    </div>
  );
}
