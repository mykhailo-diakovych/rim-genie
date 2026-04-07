import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format-currency";
import { orpc } from "@/utils/orpc";

type InvoiceStatus = "unpaid" | "partially_paid" | "paid";

interface InvoiceRow {
  id: string;
  invoiceNumber: number;
  total: number;
  status: InvoiceStatus;
  createdAt: Date;
  customerName: string;
  customerEmail: string | null;
}

interface LatestInvoicesProps {
  invoices: InvoiceRow[];
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  unpaid: "text-red-500",
  partially_paid: "text-yellow-500",
  paid: "text-green-600",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partial",
  paid: "Paid",
};

export function LatestInvoices({ invoices }: LatestInvoicesProps) {
  const sendReceipt = useMutation({
    ...orpc.cashier.invoices.sendReceipt.mutationOptions(),
    onSuccess: () => toast.success("Receipt sent successfully"),
    onError: (err: Error) => toast.error(`Failed to send: ${err.message}`),
  });

  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-rubik text-sm leading-4.5 font-medium text-body">Latest Invoices</p>
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link to="/cashier" search={{ tab: "unpaid", dateRange: "30d" }} />}
          className="flex items-center gap-0.5 text-xs text-label"
        >
          View all
          <ChevronRight />
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="py-4 text-center font-rubik text-xs text-label">
          No invoices for this period
        </p>
      ) : (
        <div className="flex w-full flex-col">
          <div className="flex w-full">
            <div className="flex h-8 min-w-0 flex-1 items-center border-t border-l border-field-line px-2 py-1.5">
              <span className="font-rubik text-xs leading-3.5 font-normal text-label">Invoice</span>
            </div>
            <div className="flex h-8 min-w-0 flex-1 items-center border-t border-l border-field-line px-2 py-1.5">
              <span className="font-rubik text-xs leading-3.5 font-normal text-label">
                Customer
              </span>
            </div>
            <div className="flex h-8 w-20 items-center border-t border-l border-field-line px-2 py-1.5">
              <span className="font-rubik text-xs leading-3.5 font-normal text-label">Total</span>
            </div>
            <div className="flex h-8 w-16 items-center border-t border-l border-field-line px-2 py-1.5">
              <span className="font-rubik text-xs leading-3.5 font-normal text-label">Status</span>
            </div>
            <div className="flex h-8 w-12 items-center justify-center border-t border-r border-l border-field-line px-2 py-1.5">
              <span className="font-rubik text-xs leading-3.5 font-normal text-label">Send</span>
            </div>
          </div>

          {invoices.map((inv, idx) => {
            const isLast = idx === invoices.length - 1;
            const borderBottom = isLast ? "border-b" : "";
            return (
              <div key={inv.id} className="flex w-full">
                <div
                  className={`border-t border-l ${borderBottom} flex h-8 min-w-0 flex-1 items-center border-field-line px-2`}
                >
                  <span className="font-rubik text-xs leading-3.5 text-body">
                    INV-{String(inv.invoiceNumber).padStart(4, "0")}
                  </span>
                </div>
                <div
                  className={`border-t border-l ${borderBottom} flex h-8 min-w-0 flex-1 items-center border-field-line px-2`}
                >
                  <span className="min-w-0 flex-1 truncate font-rubik text-xs leading-3.5 text-body">
                    {inv.customerName}
                  </span>
                </div>
                <div
                  className={`border-t border-l ${borderBottom} flex h-8 w-20 items-center border-field-line px-2`}
                >
                  <span className="font-rubik text-xs leading-3.5 text-body">
                    {formatCents(inv.total)}
                  </span>
                </div>
                <div
                  className={`border-t border-l ${borderBottom} flex h-8 w-16 items-center border-field-line px-2`}
                >
                  <span className={`font-rubik text-xs leading-3.5 ${STATUS_STYLE[inv.status]}`}>
                    {STATUS_LABEL[inv.status]}
                  </span>
                </div>
                <div
                  className={`border-t border-r border-l ${borderBottom} flex h-8 w-12 items-center justify-center border-field-line px-2`}
                >
                  <button
                    type="button"
                    disabled={sendReceipt.isPending}
                    onClick={() => sendReceipt.mutate({ invoiceId: inv.id })}
                    className="flex items-center justify-center rounded p-1 text-label transition-colors hover:bg-page hover:text-body disabled:opacity-50"
                    title="Send invoice"
                  >
                    <Mail className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
