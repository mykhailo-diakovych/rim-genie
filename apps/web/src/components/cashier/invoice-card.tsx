import { Link } from "@tanstack/react-router";
import { Calendar, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconPay } from "@/components/ui/nav-icons";
import { RowActionsMenu, RowActionsMenuItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

export interface InvoiceCardData {
  id: string;
  invoiceNumber: number;
  status: string;
  total: number;
  balance: number;
  createdAt: Date | string;
  customerName: string;
}

interface InvoiceCardProps {
  invoice: InvoiceCardData;
  onDelete: () => void;
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatSignedCents(cents: number) {
  return cents < 0 ? `-${formatCents(-cents)}` : formatCents(cents);
}

const columnClass = "flex min-w-0 flex-col gap-1 md:flex-1 md:border-l md:border-card-line md:px-5";

export function InvoiceCard({ invoice, onDelete }: InvoiceCardProps) {
  const canPay = invoice.status === "unpaid" || invoice.status === "partially_paid";
  const canDelete = invoice.status === "unpaid";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card md:min-h-20 md:flex-row md:items-center md:gap-0 md:px-4">
      <div className="flex min-w-0 flex-col gap-1 md:flex-1 md:pr-5">
        <span className="truncate font-rubik text-base leading-5 font-medium text-body">
          {invoice.customerName}
        </span>
        <span className="font-rubik text-xs text-label">
          {`INV-${String(invoice.invoiceNumber).padStart(4, "0")}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:contents">
        <div className={cn(columnClass, "flex-row items-start gap-2.5")}>
          <Calendar className="mt-0.5 size-5 shrink-0 text-label" />
          <div className="flex min-w-0 flex-col gap-1 font-rubik">
            <span className="text-xs text-label">Invoice Date</span>
            <span className="truncate text-sm text-body">{formatDate(invoice.createdAt)}</span>
          </div>
        </div>

        <div className={cn(columnClass, "font-rubik")}>
          <span className="text-xs text-label">Balance Due</span>
          <span
            className={cn(
              "truncate text-lg leading-6 font-semibold",
              invoice.balance < 0 ? "text-red" : "text-body",
            )}
          >
            {formatSignedCents(invoice.balance)}
          </span>
          <span className="truncate text-xs text-label">
            Total: {formatSignedCents(invoice.total)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:border-l md:border-card-line md:pl-5">
        <Button
          nativeButton={false}
          render={<Link to="/cashier/$invoiceId" params={{ invoiceId: invoice.id }} />}
        >
          <Eye />
          View
        </Button>
        <Button
          variant="outline"
          color="success"
          className="data-disabled:pointer-events-none data-disabled:opacity-45"
          disabled={!canPay}
          nativeButton={false}
          render={<Link to="/cashier/$invoiceId/checkout" params={{ invoiceId: invoice.id }} />}
        >
          <IconPay />
          Pay
        </Button>
        <RowActionsMenu label="Invoice actions" className="size-9.5">
          <RowActionsMenuItem destructive disabled={!canDelete} onClick={onDelete}>
            <Trash2 />
            <span className="flex flex-col">
              Delete
              {!canDelete && (
                <span className="text-xs text-label">Only unpaid invoices can be deleted</span>
              )}
            </span>
          </RowActionsMenuItem>
        </RowActionsMenu>
      </div>
    </div>
  );
}

export function InvoiceCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card md:min-h-20 md:flex-row md:items-center md:gap-0 md:px-4">
      <div className="flex flex-col gap-1.5 md:flex-1 md:pr-5">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:contents">
        <div className={cn(columnClass, "flex-row items-start gap-2.5")}>
          <Skeleton className="size-5 shrink-0 rounded" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
        <div className={cn(columnClass, "gap-1.5")}>
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-6 w-28 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2 md:border-l md:border-card-line md:pl-5">
        <Skeleton className="h-9.5 w-18 rounded-md" />
        <Skeleton className="h-9.5 w-16 rounded-md" />
        <Skeleton className="size-9.5 rounded-md" />
      </div>
    </div>
  );
}
