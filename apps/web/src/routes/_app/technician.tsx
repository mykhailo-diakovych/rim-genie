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
import {
  MOCK_ASSIGN_JOBS,
  MOCK_COMPLETED_JOBS,
  MOCK_IN_PROGRESS_JOBS,
  MOCK_NEW_JOBS,
  TAB_CONFIG,
  type TabValue,
} from "@/components/technician/types";

export const Route = createFileRoute("/_app/technician")({
  component: TechnicianPage,
});

type DetailView = { id: string; source: "in-progress" | "assign" | "completed" };

const TAB_COUNTS: Record<TabValue, number> = {
  new: MOCK_NEW_JOBS.length,
  assign: MOCK_ASSIGN_JOBS.length,
  "in-progress": MOCK_IN_PROGRESS_JOBS.length,
  completed: MOCK_COMPLETED_JOBS.length,
};

function TechnicianPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("in-progress");
  const [detailView, setDetailView] = useState<DetailView | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabValue, HTMLButtonElement | null>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

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
      return <AssignDetailView jobId={detailView.id} onBack={onBack} />;
    }
    if (detailView.source === "completed") {
      return <CompletedDetailView jobId={detailView.id} onBack={onBack} />;
    }
    return <JobDetailView jobId={detailView.id} onBack={onBack} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
        List of Jobs
      </h1>

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
                  "flex h-9 cursor-pointer items-center gap-1.5 px-3 py-2 font-rubik text-[14px] leading-[18px] outline-none transition-colors",
                  isActive ? "text-blue" : "text-body hover:text-body/70",
                )}
              >
                {tab.label}
                {TAB_COUNTS[tab.value] > 0 && (
                  <span
                    className={cn(
                      "flex h-[18px] min-w-[28px] items-center justify-center rounded-full px-1 font-rubik text-[12px] leading-[14px] transition-colors duration-200",
                      isActive ? "bg-blue text-white" : "bg-[#e2e4e5] text-label",
                    )}
                  >
                    {TAB_COUNTS[tab.value]}
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

        {/* Tab content */}
        {activeTab === "in-progress" && (
          <div className="flex flex-col gap-3 pt-3">
            <FilterRow />
            <div className="flex flex-col gap-2">
              {MOCK_IN_PROGRESS_JOBS.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={() => setDetailView({ id: job.id, source: "in-progress" })}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "assign" && (
          <div className="flex flex-col gap-3 pt-3">
            <FilterRow />
            <div className="flex flex-col gap-2">
              {MOCK_ASSIGN_JOBS.map((job) => (
                <AssignJobCard
                  key={job.id}
                  job={job}
                  onView={() => setDetailView({ id: job.id, source: "assign" })}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "new" && (
          <p className="pt-3 font-rubik text-[12px] leading-[14px] text-label">No new jobs.</p>
        )}

        {activeTab === "completed" && (
          <div className="flex flex-col gap-3 pt-3">
            <FilterRow />
            <div className="flex flex-col gap-2">
              {MOCK_COMPLETED_JOBS.map((job) => (
                <CompletedJobCard
                  key={job.id}
                  job={job}
                  onView={() => setDetailView({ id: job.id, source: "completed" })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
