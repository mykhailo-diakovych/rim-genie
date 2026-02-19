import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AttentionRequiredCard } from "@/components/dashboard/attention-required-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TeamActivityTable } from "@/components/dashboard/team-activity-table";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { IconInvoice, IconJobs, IconNight, IconRevenue } from "@/components/ui/nav-icons";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

type Period = "today" | "week" | "month";

export const Route = createFileRoute("/_app/dashboard")({
  component: RouteComponent,
});

const PERIOD_TABS: readonly { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const METRIC_CONFIG = {
  revenue: { icon: IconRevenue, color: "#6bc851", subtitle: () => m.metric_subtitle_today() },
  open_jobs: { icon: IconInvoice, color: "#f5756a", subtitle: () => m.metric_subtitle_today() },
  active_jobs: { icon: IconJobs, color: "#34c8e3", subtitle: () => m.metric_subtitle_currently() },
  sleep_time: { icon: IconNight, color: "#335791", subtitle: () => m.metric_subtitle_currently() },
} as const;

function RouteComponent() {
  const [period, setPeriod] = useState<Period>("today");

  const metricsQuery = useQuery(orpc.dashboard.metrics.queryOptions({ input: { period } }));
  const teamQuery = useQuery(orpc.dashboard.teamActivity.queryOptions({ input: { period } }));
  const attentionQuery = useQuery(
    orpc.dashboard.attentionRequired.queryOptions({ input: { period } }),
  );

  const isLoading =
    (metricsQuery.isLoading && !metricsQuery.data) ||
    (teamQuery.isLoading && !teamQuery.data) ||
    (attentionQuery.isLoading && !attentionQuery.data);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
          {m.dashboard_title()}
        </h1>
        <SegmentedControl
          tabs={PERIOD_TABS.map((t) => ({
            ...t,
            label:
              t.value === "today"
                ? m.period_today()
                : t.value === "week"
                  ? m.period_week()
                  : m.period_month(),
          }))}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {/* Metric cards 2×2 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {metricsQuery.data?.map((metric) => {
          const config = METRIC_CONFIG[metric.key as keyof typeof METRIC_CONFIG] ?? {
            icon: IconRevenue,
            color: "#6bc851",
            subtitle: () => "",
          };
          const titleKey = `metric_${metric.key}` as keyof typeof m;
          const titleFn = m[titleKey] as (() => string) | undefined;
          return (
            <MetricCard
              key={metric.key}
              title={titleFn ? titleFn() : metric.key}
              subtitle={config.subtitle()}
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
      <div className="grid items-start gap-3 lg:grid-cols-[1fr_248px]">
        {teamQuery.data && <TeamActivityTable rows={teamQuery.data.rows} />}
        {attentionQuery.data && <AttentionRequiredCard items={attentionQuery.data.items} />}
      </div>
    </div>
  );
}
