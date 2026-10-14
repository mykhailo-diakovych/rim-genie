import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import type { UserRole } from "@rim-genie/db/schema";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { authClient } from "@/lib/auth-client";
import { formatCents } from "@/lib/format-currency";
import { hasRouteAccess } from "@/lib/route-permissions";
import { orpc } from "@/utils/orpc";

type AttentionKind = "overdue" | "inventory" | "unassigned" | "invoices";

interface AttentionListDialogProps {
  kind: AttentionKind | null;
  title: string;
  onOpenChange: (open: boolean) => void;
}

const COLUMNS: Record<AttentionKind, string[]> = {
  overdue: ["Invoice", "Customer", "Technician", "Status", "Due"],
  unassigned: ["Invoice", "Customer", "Status", "Created"],
  invoices: ["Invoice", "Customer", "Total", "Created"],
  inventory: ["Date", "SOD Rims", "EOD Rims", "Notes", "Recorded By"],
};

function formatInvoiceNumber(invoiceNumber: number) {
  return `INV-${String(invoiceNumber).padStart(4, "0")}`;
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

const LINK_CLASS = "text-blue hover:underline";

function JobInvoiceLink({
  role,
  row,
}: {
  role: UserRole | undefined;
  row: { invoiceId: string; invoiceNumber: number; customerId: string; status: string };
}) {
  const label = formatInvoiceNumber(row.invoiceNumber);
  if (hasRouteAccess("/technician", role)) {
    return (
      <Link
        to="/technician/$invoiceId"
        params={{ invoiceId: row.invoiceId }}
        search={{ source: row.status === "pending" ? "assign" : "in-progress" }}
        className={LINK_CLASS}
      >
        {label}
      </Link>
    );
  }
  if (hasRouteAccess("/customers", role)) {
    return (
      <Link
        to="/customers/$customerId/jobs/$invoiceId"
        params={{ customerId: row.customerId, invoiceId: row.invoiceId }}
        className={LINK_CLASS}
      >
        {label}
      </Link>
    );
  }
  return <>{label}</>;
}

function InvoiceLink({
  role,
  row,
}: {
  role: UserRole | undefined;
  row: { id: string; invoiceNumber: number; customerId: string };
}) {
  const label = formatInvoiceNumber(row.invoiceNumber);
  if (hasRouteAccess("/cashier", role)) {
    return (
      <Link to="/cashier/$invoiceId" params={{ invoiceId: row.id }} className={LINK_CLASS}>
        {label}
      </Link>
    );
  }
  if (hasRouteAccess("/customers", role)) {
    return (
      <Link
        to="/customers/$customerId"
        params={{ customerId: row.customerId }}
        className={LINK_CLASS}
      >
        {label}
      </Link>
    );
  }
  return <>{label}</>;
}

function AttentionRows({ kind, role }: { kind: AttentionKind; role: UserRole | undefined }) {
  const { data, isLoading } = useQuery(
    orpc.dashboard.attentionList.queryOptions({ input: { kind } }),
  );
  const colSpan = COLUMNS[kind].length;

  if (isLoading || !data) {
    return (
      <tr className="border-b border-field-line">
        <td colSpan={colSpan} className="border-r border-l border-field-line px-2 py-6">
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
          </div>
        </td>
      </tr>
    );
  }

  if (data.rows.length === 0) {
    return (
      <tr className="border-b border-field-line">
        <td
          colSpan={colSpan}
          className="border-r border-l border-field-line px-2 py-6 text-center text-label"
        >
          Nothing needs attention here
        </td>
      </tr>
    );
  }

  let rows: { id: string; cells: ReactNode[] }[];
  switch (data.kind) {
    case "overdue":
      rows = data.rows.map((r) => ({
        id: r.id,
        cells: [
          <JobInvoiceLink role={role} row={r} />,
          r.customerName,
          r.technicianName ?? "—",
          <StatusBadge status={r.status} />,
          formatDate(r.dueDate),
        ],
      }));
      break;
    case "unassigned":
      rows = data.rows.map((r) => ({
        id: r.id,
        cells: [
          <JobInvoiceLink role={role} row={r} />,
          r.customerName,
          <StatusBadge status={r.status} />,
          formatDate(r.createdAt),
        ],
      }));
      break;
    case "invoices":
      rows = data.rows.map((r) => ({
        id: r.id,
        cells: [
          <InvoiceLink role={role} row={r} />,
          r.customerName,
          formatCents(r.total),
          formatDate(r.createdAt),
        ],
      }));
      break;
    case "inventory":
      rows = data.rows.map((r) => ({
        id: r.id,
        cells: [
          formatDate(`${r.recordDate}T12:00:00`),
          r.rimCount,
          r.eodRimCount ?? "—",
          r.discrepancyNotes ?? "—",
          r.recordedByName,
        ],
      }));
      break;
  }

  return rows.map((row) => (
    <tr key={row.id} className="border-b border-field-line align-top">
      {row.cells.map((cell, idx) => (
        <td
          key={idx}
          className={`border-l border-field-line px-2 py-2 text-body ${idx === row.cells.length - 1 ? "border-r" : ""}`}
        >
          {cell}
        </td>
      ))}
    </tr>
  ));
}

export function AttentionListDialog({ kind, title, onOpenChange }: AttentionListDialogProps) {
  const { data: session } = authClient.useSession();
  const role = session?.user.role as UserRole | undefined;

  return (
    <Dialog open={kind !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {kind && (
          <div className="max-h-[70dvh] overflow-auto p-3">
            <table className="w-full min-w-[500px] font-rubik text-xs">
              <thead>
                <tr className="border-t border-b border-field-line text-left text-label">
                  {COLUMNS[kind].map((col, idx) => (
                    <th
                      key={col}
                      className={`border-l border-field-line px-2 py-2 font-normal ${idx === COLUMNS[kind].length - 1 ? "border-r" : ""}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AttentionRows kind={kind} role={role} />
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
