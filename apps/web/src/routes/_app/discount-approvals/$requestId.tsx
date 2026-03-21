import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Percent, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-page" />
          <div className="h-64 rounded-lg bg-page" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 text-center">
        <p className="text-label">Discount request not found.</p>
        <Button
          nativeButton={false}
          render={<Link to="/dashboard" />}
          variant="outline"
          className="mt-4"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isPending = request.status === "pending";
  const isQuote = request.type === "quote";
  const targetName = isQuote
    ? `Quote #${request.quote?.quoteNumber}`
    : (request.customer?.name ?? "Customer");

  const previewAmount =
    isQuote && request.quote
      ? Math.round((request.quote.subtotal * request.requestedPercent) / 100)
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button
          nativeButton={false}
          render={<Link to="/dashboard" />}
          variant="ghost"
          className="size-9 p-0"
        >
          <ArrowLeft />
        </Button>
        <h1 className="font-rubik text-lg font-semibold text-body">Discount Approval</h1>
        <StatusBadge status={request.status} />
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-field-line bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue/10">
              <Percent className="size-5 text-blue" />
            </div>
            <div>
              <p className="font-rubik text-sm font-medium text-body">{targetName}</p>
              <p className="font-rubik text-xs text-label">
                {isQuote ? "Quote Discount" : "Customer Default Discount"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Requested By" value={request.requestedBy?.name ?? "Unknown"} />
            <InfoField label="Requested On" value={formatDate(request.createdAt)} />
            <InfoField label="Requested Discount" value={`${request.requestedPercent}%`} />
            {isQuote && request.quote && (
              <InfoField label="Quote Subtotal" value={formatCents(request.quote.subtotal)} />
            )}
            {previewAmount !== null && (
              <InfoField label="Discount Amount" value={formatCents(previewAmount)} />
            )}
            {isQuote && request.quote && previewAmount !== null && (
              <InfoField
                label="New Total"
                value={formatCents(request.quote.subtotal - previewAmount)}
              />
            )}
            {isQuote && request.quote?.customer && (
              <InfoField label="Customer" value={request.quote.customer.name} />
            )}
          </div>

          {request.reason && (
            <div className="mt-4 rounded-md bg-page p-3">
              <p className="font-rubik text-xs text-label">Reason</p>
              <p className="mt-1 font-rubik text-sm text-body">{request.reason}</p>
            </div>
          )}
        </div>

        {!isPending && (
          <div className="rounded-lg border border-field-line bg-card p-5">
            <p className="mb-2 font-rubik text-sm font-medium text-body">Resolution</p>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="mt-4 rounded-md bg-page p-3">
                <p className="font-rubik text-xs text-label">Admin Note</p>
                <p className="mt-1 font-rubik text-sm text-body">{request.adminNote}</p>
              </div>
            )}
          </div>
        )}

        {isPending && (
          <div className="rounded-lg border border-field-line bg-card p-5">
            <p className="mb-3 font-rubik text-sm font-medium text-body">Admin Note (optional)</p>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full rounded-md border border-field-line bg-input px-3 py-2 font-rubik text-sm text-body placeholder:text-ghost focus:border-blue focus:outline-none"
              rows={2}
            />

            {overrideMode && (
              <div className="mt-3">
                <label className="mb-1 block font-rubik text-xs text-label">
                  Override Discount %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={overridePercent}
                  onChange={(e) => setOverridePercent(e.target.value)}
                  className="w-32 rounded-md border border-field-line bg-input px-3 py-2 font-rubik text-sm text-body focus:border-blue focus:outline-none"
                  placeholder="0-100"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                color="success"
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
                {overrideMode ? "Approve with Override" : `Approve ${request.requestedPercent}%`}
              </Button>

              <Button
                variant="outline"
                onClick={() => setOverrideMode(!overrideMode)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <Percent />
                {overrideMode ? "Cancel Override" : "Override Amount"}
              </Button>

              <Button
                color="destructive"
                onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <ThumbsDown />
                Reject
              </Button>
            </div>
          </div>
        )}
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
