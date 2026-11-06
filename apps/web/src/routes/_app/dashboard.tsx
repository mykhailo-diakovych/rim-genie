import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AttentionRequiredCard } from "@/components/dashboard/attention-required-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { LatestInvoices } from "@/components/dashboard/latest-invoices";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TeamActivityTable } from "@/components/dashboard/team-activity-table";
import {
  DateRangeFilter,
  formatDateRangeLabel,
  getDateFrom,
  getDateTo,
  parseDateRange,
  type DateRange,
} from "@/components/ui/date-range-filter";
import { usePersistedState } from "@/lib/use-persisted-state";
import { IconInvoice, IconJobs, IconNight, IconRevenue } from "@/components/ui/nav-icons";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Dashboard" }],
  }),
  component: RouteComponent,
});

const METRIC_CONFIG = {
  revenue: { icon: IconRevenue, color: "#6bc851" },
  open_jobs: { icon: IconInvoice, color: "#f5756a" },
  active_jobs: { icon: IconJobs, color: "#34c8e3" },
  sleep_time: { icon: IconNight, color: "#335791" },
} as const;

function RouteComponent() {
  const [dateRange, setDateRangeState] = usePersistedState<DateRange>(
    "dashboard.dateRange",
    "today",
    (v) => parseDateRange(v, "today"),
  );
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

  function setDateRange(next: DateRange) {
    setDateRangeState(next);
    setInvoicePage(1);
  }

  const input = { dateFrom: getDateFrom(dateRange), dateTo: getDateTo(dateRange) };
  const metricsQuery = useQuery(
    orpc.dashboard.metrics.queryOptions({ input, placeholderData: keepPreviousData }),
  );
  const teamQuery = useQuery(
    orpc.dashboard.teamActivity.queryOptions({ input, placeholderData: keepPreviousData }),
  );
  const attentionQuery = useQuery(orpc.dashboard.attentionRequired.queryOptions());
  const latestInvoicesQuery = useQuery(
    orpc.dashboard.latestInvoices.queryOptions({
      input: { ...input, page: invoicePage, pageSize: invoicePageSize },
      placeholderData: keepPreviousData,
    }),
  );

  // Skeleton only on first load, so the date filter stays mounted while refetching.
  if (!metricsQuery.data && !teamQuery.data && !attentionQuery.data) {
    return <DashboardSkeleton />;
  }

  const subtitle = formatDateRangeLabel(dateRange);

  return (
    <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
          {m.dashboard_title()}
        </h1>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Metric cards 2×2 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {metricsQuery.data?.map((metric) => {
          const config = METRIC_CONFIG[metric.key as keyof typeof METRIC_CONFIG] ?? {
            icon: IconRevenue,
            color: "#6bc851",
          };
          const titleKey = `metric_${metric.key}` as keyof typeof m;
          const titleFn = m[titleKey] as (() => string) | undefined;
          return (
            <MetricCard
              key={metric.key}
              title={titleFn ? titleFn() : metric.key}
              subtitle={subtitle}
              value={metric.value}
              change={metric.change}
              sparkline={metric.sparkline}
              accentColor={config.color}
              icon={config.icon}
            />
          );
        })}
      </div>

      {/* Bottom row */}
      <div className="grid items-start gap-4 sm:grid-cols-[1fr_248px] lg:grid-cols-[2fr_1fr]">
        {teamQuery.data && <TeamActivityTable rows={teamQuery.data.rows} />}
        {attentionQuery.data && <AttentionRequiredCard items={attentionQuery.data.items} />}
      </div>

      {latestInvoicesQuery.data && (
        <LatestInvoices
          invoices={latestInvoicesQuery.data.rows}
          total={latestInvoicesQuery.data.total}
          page={invoicePage}
          pageSize={invoicePageSize}
          onPageChange={setInvoicePage}
          onPageSizeChange={setInvoicePageSize}
        />
      )}
    </div>
  );
}
