import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-card-line bg-white p-3 shadow-card">
      {/* Title row: icon circle + title/subtitle */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 shrink-0 rounded-full" />
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
        <Skeleton className="h-9 w-[200px] rounded-md" />
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
        <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card">
          <Skeleton className="h-[18px] w-28 rounded-[3px]" />
          <div className="flex w-full flex-col">
            {/* Header row */}
            <div className="flex w-full">
              <div className="flex h-[32px] flex-1 items-center border-t border-l border-field-line px-2">
                <Skeleton className="h-3 w-16 rounded-[3px]" />
              </div>
              <div className="flex h-[32px] w-[80px] items-center border-t border-l border-field-line px-2">
                <Skeleton className="h-3 w-10 rounded-[3px]" />
              </div>
              <div className="flex h-[32px] w-[80px] items-center border-t border-r border-l border-field-line px-2">
                <Skeleton className="h-3 w-12 rounded-[3px]" />
              </div>
            </div>
            {/* 5 data rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex w-full">
                <div
                  className={`border-t border-l ${i === 4 ? "border-b" : ""} flex h-[32px] flex-1 items-center border-field-line px-2`}
                >
                  <Skeleton className="h-3 w-28 rounded-[3px]" />
                </div>
                <div
                  className={`border-t border-l ${i === 4 ? "border-b" : ""} flex h-[32px] w-[80px] items-center border-field-line px-2`}
                >
                  <Skeleton className="h-3 w-4 rounded-[3px]" />
                </div>
                <div
                  className={`border-t border-r border-l ${i === 4 ? "border-b" : ""} flex h-[32px] w-[80px] items-center border-field-line px-2`}
                >
                  <Skeleton className="h-3 w-4 rounded-[3px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Required */}
        <div className="flex flex-col gap-3 rounded-xl border border-[rgba(219,62,33,0.5)] bg-white p-3 shadow-card">
          <Skeleton className="h-[18px] w-36 rounded-[3px]" />
          <div className="flex w-full flex-col gap-[8px]">
            {/* Item 1 with divider */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-[4px]">
                  <Skeleton className="size-5 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 min-w-0 flex-1 rounded-[3px]" />
                </div>
                <Skeleton className="h-[18px] w-9 shrink-0 rounded-[4px]" />
              </div>
              <div className="h-px w-full bg-[rgba(219,62,33,0.08)]" />
            </div>
            {/* Item 2 */}
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-[4px]">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 min-w-0 flex-1 rounded-[3px]" />
              </div>
              <Skeleton className="h-[18px] w-9 shrink-0 rounded-[4px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
