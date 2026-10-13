import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import {
  InventoryInvoiceCard,
  InventoryJobCard,
  InventoryJobCardSkeleton,
} from "@/components/inventory/inventory-job-card";
import { TAB_CONFIG, type ApiJob, type TabValue } from "@/components/inventory/types";
import { useInventoryCounts, useInventoryJobs } from "@/components/inventory/use-inventory";
import {
  DateRangeFilter,
  getDateFrom,
  getDateTo,
  type DateRange,
  parseDateRange,
} from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { usePersistedState } from "@/lib/use-persisted-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/lib/use-debounce";
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
  const [activeTab, setActiveTab] = usePersistedState<TabValue>("inventory.tab", "overnight", (v) =>
    TAB_CONFIG.some((t) => t.value === v) ? (v as TabValue) : null,
  );
  const [dateRange, setDateRange] = usePersistedState<DateRange>(
    "inventory.dateRange",
    "30d",
    (v) => parseDateRange(v, "30d"),
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim());
  const filter = {
    dateFrom: getDateFrom(dateRange),
    dateTo: getDateTo(dateRange),
    search: debouncedSearch || undefined,
  };
  const { data: counts } = useInventoryCounts(filter);

  return (
    <div className="flex flex-1 flex-col p-3 sm:p-5">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabValue)}>
        {/* Title, date filter, tabs and search travel together and stay put while the list
            below scrolls, so switching tab never means scrolling back to the top.
            The negative margins let the background bleed over the page padding,
            otherwise rows show through the gap as they pass underneath. */}
        <div className="z-10 -mx-3 -mt-3 flex flex-col gap-5 bg-background px-3 pt-3 pb-4 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5 md:sticky md:top-0">
          <PageHeader
            title="Inventory"
            description="Track incoming items, manage inventory status, and coordinate customer pickups."
            actions={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
          />

          <TabsList className="overflow-x-auto">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 gap-1.5">
                {tab.label}
                {counts && (
                  <TabCounter count={counts[tab.value]} active={activeTab === tab.value} />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <Input
            value={search}
            placeholder="Search by customer name or Job ID..."
            leadingIcon={<Search className="size-4" />}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <InventoryJobList tab={tab.value} filter={filter} />
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

function InventoryJobList({
  tab,
  filter,
}: {
  tab: TabValue;
  filter: Parameters<typeof useInventoryJobs>[1];
}) {
  const { data: jobs, isLoading } = useInventoryJobs(tab, filter);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <InventoryJobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <p className="py-4 font-rubik text-xs leading-3.5 text-label">
        {filter.search ? `No jobs match "${filter.search}".` : "No jobs found."}
      </p>
    );
  }

  if (tab === "readyForPickup") {
    return (
      <div className="flex flex-col gap-2">
        {groupByInvoice(jobs).map((invoiceJobs) => (
          <InventoryInvoiceCard key={invoiceJobs[0]!.invoiceId} jobs={invoiceJobs} tab={tab} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <InventoryJobCard key={job.id} job={job} tab={tab} />
      ))}
    </div>
  );
}

function groupByInvoice(jobs: ApiJob[]) {
  const groups = new Map<string, ApiJob[]>();
  for (const job of jobs) {
    groups.set(job.invoiceId, [...(groups.get(job.invoiceId) ?? []), job]);
  }
  return Array.from(groups.values());
}
