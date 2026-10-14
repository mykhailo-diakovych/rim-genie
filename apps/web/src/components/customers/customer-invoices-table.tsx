import { Link } from "@tanstack/react-router";
import { Eye, Printer } from "lucide-react";

import type { AppRouterClient } from "@rim-genie/api/routers/index";

import { Button } from "@/components/ui/button";
import { IconPay } from "@/components/ui/nav-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCents } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

type CustomerDetail = NonNullable<
  Awaited<ReturnType<AppRouterClient["floor"]["customers"]["getById"]>>
>;
export type CustomerInvoice = CustomerDetail["invoices"][number];

const STATUS_BG: Record<CustomerInvoice["status"], string> = {
  unpaid: "bg-badge-red",
  partially_paid: "bg-badge-orange",
  paid: "bg-badge-green",
};

const headClass = "h-8 border-t border-l border-field-line px-2 py-1.5 font-normal";
const cellClass = "border-t border-l border-field-line p-2 text-sm leading-4.5";

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatInvoiceNumber(n: number) {
  return `INV-${String(n).padStart(4, "0")}`;
}

function formatSignedCents(cents: number) {
  return cents < 0 ? `-${formatCents(-cents)}` : formatCents(cents);
}

export function CustomerInvoicesTable({
  invoices,
  canOpenCashier,
}: {
  invoices: CustomerInvoice[];
  canOpenCashier: boolean;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] font-rubik text-xs">
        <thead>
          <tr className="text-left text-label">
            <th className={headClass}>Date</th>
            <th className={headClass}>Invoice #</th>
            <th className={headClass}>Prepared By</th>
            <th className={headClass}>Total</th>
            <th className={headClass}>Balance Due</th>
            <th className={headClass}>Status</th>
            <th className={cn(headClass, "border-r")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="border border-field-line px-2 py-6 text-center text-sm text-label"
              >
                No invoices yet
              </td>
            </tr>
          )}
          {invoices.map((inv, idx) => {
            const borderB = idx === invoices.length - 1 ? "border-b" : "";
            return (
              <tr key={inv.id}>
                <td className={cn(cellClass, "text-body", borderB)}>{formatDate(inv.createdAt)}</td>
                <td className={cn(cellClass, "text-body", borderB)}>
                  {canOpenCashier ? (
                    <Link
                      to="/cashier/$invoiceId"
                      params={{ invoiceId: inv.id }}
                      search={{ from: "customer" }}
                      className="text-blue underline"
                    >
                      {formatInvoiceNumber(inv.invoiceNumber)}
                    </Link>
                  ) : (
                    formatInvoiceNumber(inv.invoiceNumber)
                  )}
                </td>
                <td className={cn(cellClass, "text-body", borderB)}>{inv.preparedByName}</td>
                <td className={cn(cellClass, "text-body", borderB)}>{formatCents(inv.total)}</td>
                <td className={cn(cellClass, inv.balance < 0 ? "text-red" : "text-body", borderB)}>
                  {formatSignedCents(inv.balance)}
                </td>
                <td className={cn(cellClass, borderB)}>
                  <StatusBadge status={inv.status} className={STATUS_BG[inv.status]} />
                </td>
                <td className={cn(cellClass, "border-r", borderB)}>
                  <div className="flex flex-wrap items-center gap-2">
                    {canOpenCashier && (
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link
                            to="/cashier/$invoiceId"
                            params={{ invoiceId: inv.id }}
                            search={{ from: "customer" }}
                          />
                        }
                      >
                        <Eye />
                        View
                      </Button>
                    )}
                    {canOpenCashier && inv.balance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        color="success"
                        nativeButton={false}
                        render={
                          <Link
                            to="/cashier/$invoiceId/checkout"
                            params={{ invoiceId: inv.id }}
                            search={{ from: "customer" }}
                          />
                        }
                      >
                        <IconPay />
                        Pay
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" />
                      }
                    >
                      <Printer />
                      Print
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
