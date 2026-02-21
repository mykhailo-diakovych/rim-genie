import { useEffect, useRef, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { AssignDetailView } from "@/components/technician/assign-detail-view";
import { AssignJobCard } from "@/components/technician/assign-job-card";
import { CompletedDetailView } from "@/components/technician/completed-detail-view";
import { CompletedJobCard } from "@/components/technician/completed-job-card";
import { FilterRow } from "@/components/technician/filter-row";
import { JobCard } from "@/components/technician/job-card";
import { JobDetailView } from "@/components/technician/job-detail-view";
import { TAB_CONFIG, type JobGroup, type TabValue } from "@/components/technician/types";
import { useJobs } from "@/components/technician/use-jobs";

export const Route = createFileRoute("/_app/technician")({
  component: TechnicianPage,
});

type DetailView = { group: JobGroup; source: "in-progress" | "assign" | "completed" };

function TechnicianPage() {
  const { assign, inProgress, completed, isLoading } = useJobs();
  const [activeTab, setActiveTab] = useState<TabValue>("in-progress");
  const [detailView, setDetailView] = useState<DetailView | null>(null);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: TabValue) {
    setActiveTab(tab);
    measureIndicator(tab);
  }

  if (detailView !== null) {
    const onBack = () => setDetailView(null);
    if (detailView.source === "assign") {
      return <AssignDetailView group={detailView.group} onBack={onBack} />;
    }
    if (detailView.source === "completed") {
      return <CompletedDetailView group={detailView.group} onBack={onBack} />;
    }
    return <JobDetailView group={detailView.group} onBack={onBack} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">List of Jobs</h1>

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
                  "flex h-9 cursor-pointer items-center gap-1.5 px-3 py-2 font-rubik text-[14px] leading-[18px] transition-colors outline-none",
                  isActive ? "text-blue" : "text-body hover:text-body/70",
                )}
              >
                {tab.label}
                {tabCounts[tab.value] > 0 && (
                  <span
                    className={cn(
                      "flex h-[18px] min-w-[28px] items-center justify-center rounded-full px-1 font-rubik text-[12px] leading-[14px] transition-colors duration-200",
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
          <p className="pt-3 font-rubik text-[12px] leading-[14px] text-label">Loading jobs...</p>
        )}

        {!isLoading && activeTab === "in-progress" && (
          <div className="flex flex-col gap-3 pt-3">
            <FilterRow />
            <div className="flex flex-col gap-2">
              {inProgress.map((group) => (
                <JobCard
                  key={group.invoiceId}
                  group={group}
                  onView={() => setDetailView({ group, source: "in-progress" })}
                />
              ))}
              {inProgress.length === 0 && (
                <p className="font-rubik text-[12px] leading-[14px] text-label">
                  No in-progress jobs.
                </p>
              )}
            </div>
          </div>
        )}

        {!isLoading && activeTab === "assign" && (
          <div className="flex flex-col gap-3 pt-3">
            <FilterRow />
            <div className="flex flex-col gap-2">
              {assign.map((group) => (
                <AssignJobCard
                  key={group.invoiceId}
                  group={group}
                  onView={() => setDetailView({ group, source: "assign" })}
                />
              ))}
              {assign.length === 0 && (
                <p className="font-rubik text-[12px] leading-[14px] text-label">
                  No jobs to assign.
                </p>
              )}
            </div>
          </div>
        )}

        {!isLoading && activeTab === "new" && (
          <p className="pt-3 font-rubik text-[12px] leading-[14px] text-label">No new jobs.</p>
        )}

        {!isLoading && activeTab === "completed" && (
          <div className="flex flex-col gap-3 pt-3">
            <FilterRow />
            <div className="flex flex-col gap-2">
              {completed.map((group) => (
                <CompletedJobCard
                  key={group.invoiceId}
                  group={group}
                  onView={() => setDetailView({ group, source: "completed" })}
                />
              ))}
              {completed.length === 0 && (
                <p className="font-rubik text-[12px] leading-[14px] text-label">
                  No completed jobs.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
