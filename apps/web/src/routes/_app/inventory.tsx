import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { InventoryJobCard } from "@/components/inventory/inventory-job-card";
import { TAB_CONFIG, type TabValue } from "@/components/inventory/types";
import { useInventoryCounts, useInventoryJobs } from "@/components/inventory/use-inventory";
import { DateRangeFilter, getDateFrom, type DateRange } from "@/components/ui/date-range-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { requireRoles } from "@/lib/route-permissions";

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
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
    return (
      <div className="flex flex-col gap-2 pt-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 rounded-xl border border-card-line bg-white p-3 shadow-card"
          >
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <div className="h-4 w-32 rounded bg-page" />
                  <div className="h-5 w-16 rounded bg-page" />
                </div>
                <div className="h-3 w-24 rounded bg-page" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-4 w-48 rounded bg-page" />
                <div className="h-4 w-36 rounded bg-page" />
              </div>
              <div className="h-3 w-40 rounded bg-page" />
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <div className="size-9 rounded-lg bg-page" />
              <div className="size-9 rounded-lg bg-page" />
            </div>
          </div>
        ))}
      </div>
    );
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
