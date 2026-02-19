import { Camera, CheckCircle2, ChevronLeft, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { ReverseJobDialog } from "./reverse-job-dialog";
import { MOCK_JOB_LINES } from "./types";

const ACTION_BTN =
  "flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] font-rubik text-[12px] leading-[14px] transition-colors";

export function JobDetailView({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const data = MOCK_JOB_LINES[jobId];
  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] border border-blue font-rubik text-[12px] leading-[14px] text-blue transition-colors hover:bg-blue/5"
      >
        <ChevronLeft className="size-4" />
        Back to list
      </button>

      {/* Profile card */}
      <div className="flex items-center justify-between rounded-[12px] border border-card-line bg-white px-4 py-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        <div className="flex items-baseline gap-3">
          <span className="font-rubik text-[22px] leading-[26px] font-bold text-body">
            {data.customer}
          </span>
          <div className="flex items-baseline gap-1 font-rubik text-[14px] leading-[18px]">
            <span className="text-label">Job ID:</span>
            <span className="font-medium text-body">{jobId}</span>
          </div>
        </div>
        <ReverseJobDialog
          customer={data.customer}
          jobId={jobId}
          triggerClassName="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
          triggerContent={
            <>
              <RotateCcw className="size-4" />
              Reverse all
            </>
          }
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[12px] border border-card-line bg-white shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
        {/* Header */}
        <div className="grid grid-cols-[48px_1fr_120px_124px] border-b border-card-line px-3 py-2">
          <span className="font-rubik text-[12px] leading-[14px] text-label">#</span>
          <span className="font-rubik text-[12px] leading-[14px] text-label">Description</span>
          <span className="font-rubik text-[12px] leading-[14px] text-label">Status</span>
          <span />
        </div>

        {/* Rows */}
        {data.lines.map((line, idx) => (
          <div
            key={line.no}
            className={cn(
              "grid grid-cols-[48px_1fr_120px_124px] items-start px-3 py-3",
              idx < data.lines.length - 1 && "border-b border-card-line",
              line.status === "completed" && "bg-[#fafffa]",
            )}
          >
            <span className="pt-0.5 font-rubik text-[14px] leading-[18px] text-body">
              {line.no}
            </span>

            <div className="flex flex-col gap-1">
              <p className="font-rubik text-[14px] leading-[18px] font-medium text-body">
                {line.rimSize} Rims
              </p>
              <p className="font-rubik text-[12px] leading-[14px] text-label">
                Rim Type: {line.rimType}, Damage: {line.damage}, {line.repairs}
              </p>
              <p className="font-rubik text-[12px] leading-[14px] text-label">
                Comments: {line.comments}
              </p>
              <span className="mt-0.5 inline-flex w-fit rounded-[4px] bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white">
                {line.assignee}
              </span>
            </div>

            <div className="flex items-start pt-0.5">
              <span
                className={cn(
                  "rounded-[4px] px-1.5 py-0.5 font-rubik text-[12px] leading-[14px] text-white",
                  line.status === "completed" ? "bg-[#55ce63]" : "bg-[#f9b62e]",
                )}
              >
                {line.status === "completed" ? "Completed" : "In Progress"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {line.action === "proofs" && (
                <button
                  type="button"
                  className={cn(ACTION_BTN, "border border-green text-green hover:bg-green/5")}
                >
                  <Camera className="size-4" />
                  Proofs
                </button>
              )}
              {line.action === "done" && (
                <button
                  type="button"
                  className={cn(ACTION_BTN, "bg-green text-white hover:bg-green/90")}
                >
                  <CheckCircle2 className="size-4" />
                  Done
                </button>
              )}
              <ReverseJobDialog
                customer={data.customer}
                jobId={jobId}
                triggerClassName={cn(
                  ACTION_BTN,
                  "border border-[#db3e21] text-[#db3e21] hover:bg-[#db3e21]/5",
                )}
                triggerContent={
                  <>
                    <RotateCcw className="size-4" />
                    Reverse
                  </>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
