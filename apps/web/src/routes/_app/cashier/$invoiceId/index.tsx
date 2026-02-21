import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Info,
  MapPin,
  Phone,
  Printer,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/cashier/$invoiceId/")({
  component: InvoiceDetailPage,
});

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-page ${className}`} />;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function MoreDropdown({
  onPrint,
  onDelete,
  isDeleting,
}: {
  onPrint: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center justify-center gap-2 rounded-md border border-field-line bg-white px-3 font-rubik text-xs text-body transition-colors hover:bg-page"
      >
        More
        <ChevronDown className="size-4 text-ghost" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-36 rounded-md border border-card-line bg-white py-1 shadow-md">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPrint();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 font-rubik text-xs text-body transition-colors hover:bg-page"
          >
            <Printer className="size-4 text-ghost" />
            Print
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 font-rubik text-xs text-destructive transition-colors hover:bg-page disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invoiceQuery = useQuery(
    orpc.cashier.invoices.get.queryOptions({ input: { id: invoiceId } }),
  );
  const inv = invoiceQuery.data;

  const totalPaid = inv?.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const balance = (inv?.total ?? 0) - totalPaid;

  const invalidateInvoice = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.cashier.invoices.get.key({ input: { id: invoiceId } }),
    });
    await queryClient.invalidateQueries({
      queryKey: orpc.cashier.invoices.list.key(),
    });
  };

  const deleteInvoice = useMutation({
    ...orpc.cashier.invoices.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.cashier.invoices.list.key(),
      });
      toast.success("Invoice deleted");
      navigate({ to: "/cashier", search: { tab: "unpaid", dateRange: "30d" } });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const sendToTechnician = useMutation({
    ...orpc.cashier.jobs.sendToTechnician.mutationOptions(),
    onSuccess: async () => {
      await invalidateInvoice();
      toast.success("Jobs sent to technician");
    },
    onError: (err: Error) => toast.error(`Failed to send: ${err.message}`),
  });

  const canPay = inv?.status !== "paid";

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/cashier" search={{ tab: "unpaid", dateRange: "30d" }} />}
        >
          <ChevronLeft />
          Back to list
        </Button>

        <div className="flex flex-1 items-center justify-end gap-2">
          <Button
            color="success"
            disabled={!canPay}
            nativeButton={false}
            render={<Link to="/cashier/$invoiceId/checkout" params={{ invoiceId }} />}
          >
            <CircleDollarSign />
            Pay
          </Button>
          <Button
            variant="outline"
            onClick={() => sendToTechnician.mutate({ invoiceId })}
            disabled={sendToTechnician.isPending}
          >
            <Send />
            To Technician
          </Button>
        </div>

        <MoreDropdown
          onPrint={() => window.print()}
          onDelete={() => deleteInvoice.mutate({ id: invoiceId })}
          isDeleting={deleteInvoice.isPending}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)] print:border-0 print:shadow-none">
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Rim Genie" className="h-12 w-auto" />
          <h2 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
            {invoiceQuery.isLoading ? <Skeleton className="h-6 w-32" /> : "Invoice"}
          </h2>
        </div>

        <div className="h-px bg-field-line" />

        <div className="flex items-start gap-4">
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 pr-4 font-rubik">
              <span className="text-xs text-label">Invoice #:</span>
              <span className="text-sm text-body">
                {invoiceQuery.isLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  inv?.invoiceNumber
                )}
              </span>
            </div>

            <div className="w-px self-stretch bg-field-line" />

            <div className="flex flex-col gap-2 px-4 font-rubik">
              <span className="text-xs text-label">Date:</span>
              <span className="text-sm text-body">
                {invoiceQuery.isLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  formatDate(inv?.createdAt)
                )}
              </span>
            </div>
          </div>

          <div className="w-px self-stretch bg-field-line" />

          <div className="flex flex-1 items-start gap-3 font-rubik">
            <span className="shrink-0 pt-0.5 text-xs text-label">Invoice to:</span>
            {inv?.customer && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <User className="size-4 shrink-0 text-ghost" />
                  <span className="text-sm font-medium text-body">{inv.customer.name}</span>
                </div>
                {inv.customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-4 shrink-0 text-ghost" />
                    <span className="text-sm text-body">{inv.customer.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-field-line" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 font-rubik">
            <span className="text-base text-label">Total:</span>
            <span className="text-[22px] leading-[26px] font-medium text-body">
              {invoiceQuery.isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                formatCents(inv?.total ?? 0)
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1 font-rubik text-sm text-body">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-4 shrink-0 text-ghost" />
              <span>82c Waltham Park Rd,</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0 text-ghost" />
              <span>Kingston, Jamaica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="size-4 shrink-0 text-ghost" />
              <span>876-830-9624</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-field-line" />

        <div className="flex-1 overflow-x-auto">
          <table className="w-full font-rubik text-xs">
            <thead>
              <tr className="border-t border-b border-field-line text-left text-label">
                <th className="w-12 border-l border-field-line px-2 py-1.5 font-normal">#</th>
                <th className="border-l border-field-line px-2 py-1.5 font-normal">Description</th>
                <th className="w-20 border-l border-field-line px-2 py-1.5 font-normal">
                  Quantity
                </th>
                <th className="w-28 border-l border-field-line px-2 py-1.5 font-normal">
                  Unit Cost
                </th>
                <th className="w-28 border-r border-l border-field-line px-2 py-1.5 font-normal">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoiceQuery.isLoading ? (
                <tr className="border-b border-field-line">
                  <td colSpan={5} className="border-r border-l border-field-line px-2 py-6">
                    <div className="flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : (
                (inv?.items ?? []).map((item, idx) => (
                  <tr key={item.id} className="border-b border-field-line align-top">
                    <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                      {idx + 1}
                    </td>
                    <td className="border-l border-field-line px-2 py-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-body">
                          {item.description ?? "Rim Job"}
                        </span>
                        {item.comments && (
                          <span className="text-xs text-label">
                            Comments: {item.comments}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                      {item.quantity}
                    </td>
                    <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                      {formatCents(item.unitCost)}
                    </td>
                    <td className="border-r border-l border-field-line px-2 py-2 text-sm text-body">
                      {formatCents(item.quantity * item.unitCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="font-rubik text-xs text-label">Comments:</div>

        <div className="flex-1" />

        <div className="h-px bg-field-line" />

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 px-3 font-rubik text-base">
            <span className="text-label">Subtotal:</span>
            <span className="text-body">{formatCents(inv?.subtotal ?? 0)}</span>
          </div>
          <div className="flex items-center gap-3 rounded-sm bg-green px-3 py-2 font-rubik text-[22px] leading-[26px] text-white">
            <span>Total:</span>
            <span className="font-medium">{formatCents(inv?.total ?? 0)}</span>
          </div>
          {totalPaid > 0 && (
            <div className="flex items-center gap-3 px-3 font-rubik text-base">
              <span className="text-label">Paid:</span>
              <span className="text-body">{formatCents(totalPaid)}</span>
            </div>
          )}
          <div className="flex items-center gap-3 px-3 font-rubik text-base">
            <span className="text-label">Balance Due:</span>
            <span className="text-body">{formatCents(balance)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md bg-[#ebf5ff] px-3 py-3 print:hidden">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#cbe5fc]">
          <Info className="size-3 text-blue" />
        </div>
        <p className="font-rubik text-xs text-body">
          Rims left in Rim Genie beyond 30 days will attract a storage fee of{" "}
          <strong>$500 daily</strong>
        </p>
      </div>

    </div>
  );
}
