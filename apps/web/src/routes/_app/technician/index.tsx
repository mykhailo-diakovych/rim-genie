import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import type { DateRange } from "@/components/ui/date-range-filter";
import { requireRoles } from "@/lib/route-permissions";
import { cn } from "@/lib/utils";
import { AssignJobCard } from "@/components/technician/assign-job-card";
import { CompletedJobCard } from "@/components/technician/completed-job-card";
import { FilterRow } from "@/components/technician/filter-row";
import { JobCard } from "@/components/technician/job-card";
import { TAB_CONFIG, type TabValue } from "@/components/technician/types";
import { useJobs } from "@/components/technician/use-jobs";
import { orpc } from "@/utils/orpc";

const TAB_VALUES = TAB_CONFIG.map((t) => t.value);

export const Route = createFileRoute("/_app/technician/")({
  validateSearch: (search: Record<string, unknown>): { tab: TabValue } => ({
    tab: TAB_VALUES.includes(search.tab as TabValue) ? (search.tab as TabValue) : "new",
  }),
  beforeLoad: requireRoles(["admin", "technician"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Technician" }],
  }),
  component: TechnicianPage,
});

function TechnicianPage() {
  const { tab: activeTab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [technicianId, setTechnicianId] = useState("");
  const { data: technicians } = useQuery(orpc.technician.technicians.list.queryOptions({}));
  const { assign, inProgress, completed, isLoading } = useJobs({
    dateRange,
    technicianId,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabValue, HTMLButtonElement | null>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const tabCounts: Record<TabValue, number> = {
    new: 0,
    assign: assign.length,
    "in-progress": inProgress.length,
    completed: completed.length,
  };

  function measureIndicator(tab: TabValue) {
    const el = tabRefs.current.get(tab);
    const list = listRef.current;
    if (!el || !list) return;
    const listRect = list.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setIndicator({ left: rect.left - listRect.left, width: rect.width });
  }

  useEffect(() => {
    measureIndicator(activeTab);
    document.fonts.ready.then(() => measureIndicator(activeTab));
  }, [activeTab, tabCounts.assign, tabCounts["in-progress"], tabCounts.completed]);

  function handleTabChange(tab: TabValue) {
    void navigate({ search: { tab } });
    measureIndicator(tab);
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">List of Jobs</h1>

        <FilterRow
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          technicians={technicians}
          technicianId={technicianId}
          onTechnicianIdChange={setTechnicianId}
        />
      </div>

      <div>
        {/* Animated tab bar */}
        <div ref={listRef} className="relative flex border-b border-field-line">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                ref={(el) => {
                  tabRefs.current.set(tab.value, el);
                }}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  "flex h-9 cursor-pointer items-center gap-1.5 px-3 py-2 font-rubik text-sm leading-4.5 transition-colors outline-none",
                  isActive ? "text-blue" : "text-body hover:text-body/70",
                )}
              >
                {tab.label}
                {tabCounts[tab.value] > 0 && (
                  <span
                    className={cn(
                      "flex h-[18px] min-w-[28px] items-center justify-center rounded-full px-1 font-rubik text-xs leading-3.5 transition-colors duration-200",
                      isActive ? "bg-blue text-white" : "bg-[#e2e4e5] text-label",
                    )}
                  >
                    {tabCounts[tab.value]}
                  </span>
                )}
              </button>
            );
          })}
          {indicator && (
            <div
              className="absolute bottom-0 h-[2px] rounded-full bg-blue transition-all duration-200 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2 pt-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex animate-pulse flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-32 rounded bg-page" />
                    <div className="h-5 w-16 rounded bg-page" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 rounded bg-page" />
                    <div className="h-3 w-24 rounded bg-page" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 rounded-lg bg-page" />
                  <div className="h-9 w-28 rounded-lg bg-page" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activeTab === "in-progress" && (
          <div className="flex flex-col gap-2 pt-3">
            {inProgress.map((group) => (
              <JobCard
                key={group.invoiceId}
                group={group}
                onView={() =>
                  void navigate({
                    to: "/technician/$invoiceId",
                    params: { invoiceId: group.invoiceId },
                    search: { source: "in-progress" },
                  })
                }
              />
            ))}
            {inProgress.length === 0 && (
              <p className="font-rubik text-xs leading-3.5 text-label">No in-progress jobs.</p>
            )}
          </div>
        )}

        {!isLoading && activeTab === "assign" && (
          <div className="flex flex-col gap-2 pt-3">
            {assign.map((group) => (
              <AssignJobCard
                key={group.invoiceId}
                group={group}
                onView={() =>
                  void navigate({
                    to: "/technician/$invoiceId",
                    params: { invoiceId: group.invoiceId },
                    search: { source: "assign" },
                  })
                }
              />
            ))}
            {assign.length === 0 && (
              <p className="font-rubik text-xs leading-3.5 text-label">No jobs to assign.</p>
            )}
          </div>
        )}

        {!isLoading && activeTab === "new" && (
          <p className="pt-3 font-rubik text-xs leading-3.5 text-label">No new jobs.</p>
        )}

        {!isLoading && activeTab === "completed" && (
          <div className="flex flex-col gap-2 pt-3">
            {completed.map((group) => (
              <CompletedJobCard
                key={group.invoiceId}
                group={group}
                onView={() =>
                  void navigate({
                    to: "/technician/$invoiceId",
                    params: { invoiceId: group.invoiceId },
                    search: { source: "completed" },
                  })
                }
              />
            ))}
            {completed.length === 0 && (
              <p className="font-rubik text-xs leading-3.5 text-label">No completed jobs.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
