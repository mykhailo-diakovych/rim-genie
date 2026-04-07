import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleDollarSign, FileText, Moon, Printer, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format-currency";
import { requireRoles } from "@/lib/route-permissions";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/reports/daily")({
  beforeLoad: requireRoles(["admin"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Daily Report" }],
  }),
  component: DailyReportPage,
});

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DailyReportPage() {
  const [date, setDate] = useState(todayStr);

  const { data: report, isLoading } = useQuery(orpc.report.daily.queryOptions({ input: { date } }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-rubik text-xl font-semibold text-body">Daily Report</h1>
          {report && <p className="font-rubik text-sm text-label">{formatDate(report.date)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-field-line bg-input px-3 py-2 font-rubik text-sm text-body focus:border-blue focus:outline-none print:hidden"
          />
          <Button
            variant="outline"
            onClick={() => window.open(`/api/reports/daily/${date}`, "_blank")}
          >
            <Printer />
            Print Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : report ? (
        <div className="flex flex-col gap-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              icon={CircleDollarSign}
              label="Revenue"
              value={formatCents(report.revenue.total)}
              sub={`${report.revenue.paymentCount} payment${report.revenue.paymentCount !== 1 ? "s" : ""}`}
              color="text-emerald-600 bg-emerald-50"
            />
            <SummaryCard
              icon={Wrench}
              label="Completed Jobs"
              value={String(report.jobs.completed)}
              sub={`${report.jobs.active} active`}
              color="text-blue bg-blue/10"
            />
            <SummaryCard
              icon={FileText}
              label="Open Jobs"
              value={String(report.jobs.open)}
              sub={`${report.invoices.created} invoices created`}
              color="text-amber-600 bg-amber-50"
            />
            <SummaryCard
              icon={Moon}
              label="Overnight Jobs"
              value={String(report.jobs.overnight)}
              color="text-purple-600 bg-purple-50"
            />
          </div>

          {/* Payment Breakdown + Invoice Summary */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ReportCard title="Payment Breakdown">
              {report.revenue.byMode.length === 0 ? (
                <p className="py-4 text-center font-rubik text-sm text-label">
                  No payments recorded
                </p>
              ) : (
                <table className="w-full font-rubik text-sm">
                  <thead>
                    <tr className="border-b border-field-line text-left text-xs text-label">
                      <th className="px-3 py-2 font-normal">Method</th>
                      <th className="px-3 py-2 text-right font-normal">Count</th>
                      <th className="px-3 py-2 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.revenue.byMode.map((m) => (
                      <tr key={m.mode} className="border-b border-field-line last:border-b-0">
                        <td className="px-3 py-2.5 text-body">{MODE_LABELS[m.mode] ?? m.mode}</td>
                        <td className="px-3 py-2.5 text-right text-label">{m.count}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-body">
                          {formatCents(m.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-page">
                      <td className="px-3 py-2.5 font-medium text-body">Total</td>
                      <td className="px-3 py-2.5 text-right text-label">
                        {report.revenue.paymentCount}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-body">
                        {formatCents(report.revenue.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </ReportCard>

            <ReportCard title="Invoice Summary">
              <div className="grid grid-cols-2 gap-4 p-3">
                <StatField label="Created Today" value={String(report.invoices.created)} />
                <StatField label="Total Billed" value={formatCents(report.invoices.totalBilled)} />
                <StatField label="Paid (all time)" value={String(report.invoices.paid)} />
                <StatField label="Unpaid (all time)" value={String(report.invoices.unpaid)} />
              </div>
            </ReportCard>
          </div>

          {/* Team Activity */}
          <ReportCard title="Team Activity">
            {report.teamActivity.length === 0 ? (
              <p className="py-4 text-center font-rubik text-sm text-label">No technicians</p>
            ) : (
              <table className="w-full font-rubik text-sm">
                <thead>
                  <tr className="border-b border-field-line text-left text-xs text-label">
                    <th className="px-3 py-2 font-normal">Technician</th>
                    <th className="px-3 py-2 text-right font-normal">Active Jobs</th>
                    <th className="px-3 py-2 text-right font-normal">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {report.teamActivity.map((t) => (
                    <tr key={t.name} className="border-b border-field-line last:border-b-0">
                      <td className="px-3 py-2.5 text-body">{t.name}</td>
                      <td className="px-3 py-2.5 text-right text-label">{t.activeJobs}</td>
                      <td className="px-3 py-2.5 text-right text-label">{t.completedJobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportCard>

          {/* Attention Items */}
          <ReportCard title="Attention Required">
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
              {report.attentionItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-1 rounded-lg p-3 ${
                    item.severity === "high" ? "bg-red-50" : "bg-amber-50"
                  }`}
                >
                  <AlertTriangle
                    className={`size-5 ${item.severity === "high" ? "text-red-500" : "text-amber-500"}`}
                  />
                  <span
                    className={`font-rubik text-xl font-semibold ${
                      item.severity === "high" ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {item.count}
                  </span>
                  <span className="text-center font-rubik text-xs text-label">{item.label}</span>
                </div>
              ))}
            </div>
          </ReportCard>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex items-center gap-2">
        <div className={`flex size-8 items-center justify-center rounded-full ${color}`}>
          <Icon className="size-4" />
        </div>
        <span className="font-rubik text-xs text-label">{label}</span>
      </div>
      <span className="font-rubik text-xl font-semibold text-body">{value}</span>
      {sub && <span className="font-rubik text-xs text-ghost">{sub}</span>}
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
      <div className="border-b border-field-line px-3 py-2.5">
        <h2 className="font-rubik text-sm font-medium text-body">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-rubik text-xs text-label">{label}</span>
      <span className="font-rubik text-base font-medium text-body">{value}</span>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-card-line bg-page" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl border border-card-line bg-page" />
        <div className="h-48 animate-pulse rounded-xl border border-card-line bg-page" />
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-card-line bg-page" />
      <div className="h-32 animate-pulse rounded-xl border border-card-line bg-page" />
    </div>
  );
}
