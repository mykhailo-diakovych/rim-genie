import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";

import { InventoryJobCard } from "@/components/inventory/inventory-job-card";
import { TAB_CONFIG, type TabValue } from "@/components/inventory/types";
import { useInventoryCounts, useInventoryJobs } from "@/components/inventory/use-inventory";
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { requireRoles } from "@/lib/route-permissions";

const DATE_RANGES = ["7d", "30d", "90d", "all"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

function getDateFrom(range: DateRange): string | undefined {
  if (range === "all") return undefined;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export const Route = createFileRoute("/_app/inventory")({
  beforeLoad: requireRoles(["admin", "inventoryClerk"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Inventory" }],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("overnight");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const dateFrom = getDateFrom(dateRange);
  const { data: counts } = useInventoryCounts(dateFrom);

  return (
    <div className="flex flex-1 flex-col gap-5 p-3 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">Inventory</h1>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-36">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4 shrink-0 text-label" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectPopup>
            {DATE_RANGES.map((range) => (
              <SelectOption key={range} value={range}>
                {DATE_RANGE_LABELS[range]}
              </SelectOption>
            ))}
          </SelectPopup>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabValue)}>
        <TabsList className="overflow-x-auto">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 gap-1.5">
              {tab.label}
              {counts && <TabCounter count={counts[tab.value]} active={activeTab === tab.value} />}
            </TabsTrigger>
          ))}
        </TabsList>
        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <InventoryJobList tab={tab.value} dateFrom={dateFrom} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TabCounter({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-7 items-center justify-center rounded-full px-1 font-rubik text-xs leading-3.5",
        active ? "bg-blue text-white" : "bg-[#e2e4e5] text-label",
      )}
    >
      {count}
    </span>
  );
}

function InventoryJobList({ tab, dateFrom }: { tab: TabValue; dateFrom?: string }) {
  const { data: jobs, isLoading } = useInventoryJobs(tab, dateFrom);

  if (isLoading) {
    return <p className="py-4 font-rubik text-xs leading-3.5 text-label">Loading jobs...</p>;
  }

  if (!jobs || jobs.length === 0) {
    return <p className="py-4 font-rubik text-xs leading-3.5 text-label">No jobs found.</p>;
  }

  return (
    <div className="flex flex-col gap-2 pt-4">
      {jobs.map((job) => (
        <InventoryJobCard key={job.id} job={job} tab={tab} />
      ))}
    </div>
  );
}
