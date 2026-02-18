import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[8px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      {/* Title row: icon circle + title/subtitle */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-full shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-28 rounded-[3px]" />
          <Skeleton className="h-3 w-12 rounded-[3px]" />
        </div>
      </div>
      {/* Bottom block: value+badge | chart */}
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-[30px] w-20 rounded-[3px]" />
            <Skeleton className="h-5 w-12 rounded-[4px]" />
          </div>
          <Skeleton className="h-3 w-24 rounded-[3px]" />
        </div>
        <Skeleton className="h-12 w-24 shrink-0 rounded-[4px]" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-[26px] w-32 rounded-[4px]" />
        <Skeleton className="h-9 w-[200px] rounded-[8px]" />
      </div>

      {/* Metric cards 2×2 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid gap-3 lg:grid-cols-[1fr_248px]">
        {/* Team Activity */}
        <div className="rounded-[12px] border border-card-line bg-white p-[12px] flex flex-col gap-[12px] shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
          <Skeleton className="h-[18px] w-28 rounded-[3px]" />
          <div className="flex flex-col w-full">
            {/* Header row */}
            <div className="flex w-full">
              <div className="border-l border-t border-field-line flex-1 h-[32px] flex items-center px-2">
                <Skeleton className="h-3 w-16 rounded-[3px]" />
              </div>
              <div className="border-l border-t border-field-line w-[80px] h-[32px] flex items-center px-2">
                <Skeleton className="h-3 w-10 rounded-[3px]" />
              </div>
              <div className="border-l border-r border-t border-field-line w-[80px] h-[32px] flex items-center px-2">
                <Skeleton className="h-3 w-12 rounded-[3px]" />
              </div>
            </div>
            {/* 5 data rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex w-full">
                <div
                  className={`border-l border-t ${i === 4 ? "border-b" : ""} border-field-line flex-1 h-[32px] flex items-center px-2`}
                >
                  <Skeleton className="h-3 w-28 rounded-[3px]" />
                </div>
                <div
                  className={`border-l border-t ${i === 4 ? "border-b" : ""} border-field-line w-[80px] h-[32px] flex items-center px-2`}
                >
                  <Skeleton className="h-3 w-4 rounded-[3px]" />
                </div>
                <div
                  className={`border-l border-r border-t ${i === 4 ? "border-b" : ""} border-field-line w-[80px] h-[32px] flex items-center px-2`}
                >
                  <Skeleton className="h-3 w-4 rounded-[3px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Required */}
        <div className="rounded-[12px] border border-[rgba(219,62,33,0.5)] bg-white p-[12px] flex flex-col gap-[12px] shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
          <Skeleton className="h-[18px] w-36 rounded-[3px]" />
          <div className="flex flex-col gap-[8px] w-full">
            {/* Item 1 with divider */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex gap-[12px] items-center">
                <div className="flex flex-1 min-w-0 gap-[4px] items-center">
                  <Skeleton className="size-5 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 flex-1 min-w-0 rounded-[3px]" />
                </div>
                <Skeleton className="h-[18px] w-9 rounded-[4px] shrink-0" />
              </div>
              <div className="bg-[rgba(219,62,33,0.08)] h-px w-full" />
            </div>
            {/* Item 2 */}
            <div className="flex gap-[12px] items-center">
              <div className="flex flex-1 min-w-0 gap-[4px] items-center">
                <Skeleton className="size-5 rounded-full shrink-0" />
                <Skeleton className="h-3.5 flex-1 min-w-0 rounded-[3px]" />
              </div>
              <Skeleton className="h-[18px] w-9 rounded-[4px] shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
