import { m } from "@/paraglide/messages";

interface Row {
  name: string;
  activeJobs: number;
  completedToday: number;
}

interface TeamActivityTableProps {
  rows: Row[];
}

export function TeamActivityTable({ rows }: TeamActivityTableProps) {
  const lastIdx = rows.length - 1;
  return (
    <div className="flex flex-col gap-[12px] overflow-hidden rounded-[12px] border border-card-line bg-white p-[12px] shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <p className="font-rubik text-[14px] leading-[18px] font-medium text-body">
        {m.team_activity_title()}
      </p>
      <div className="flex w-full flex-col">
        {/* Header row */}
        <div className="flex w-full">
          <div className="flex h-[32px] min-w-0 flex-1 items-center border-t border-l border-field-line px-[8px] py-[7px]">
            <span className="font-rubik text-[12px] leading-[14px] font-normal text-label">
              {m.col_technician()}
            </span>
          </div>
          <div className="flex h-[32px] w-[80px] items-center border-t border-l border-field-line px-[8px] py-[7px]">
            <span className="min-w-0 flex-1 font-rubik text-[12px] leading-[14px] font-normal whitespace-pre-wrap text-label">
              {m.col_active_jobs()}
            </span>
          </div>
          <div className="flex h-[32px] w-[80px] items-center border-t border-r border-l border-field-line px-[8px] py-[7px]">
            <span className="min-w-0 flex-1 font-rubik text-[12px] leading-[14px] font-normal whitespace-pre-wrap text-label">
              {m.col_completed_today()}
            </span>
          </div>
        </div>
        {/* Data rows */}
        {rows.map((row, idx) => (
          <div key={row.name} className="flex w-full">
            <div
              className={`border-t border-l ${idx === lastIdx ? "border-b" : ""} flex h-[32px] min-w-0 flex-1 items-center border-field-line p-[8px]`}
            >
              <span className="min-w-0 flex-1 font-rubik text-[12px] leading-[14px] font-normal whitespace-pre-wrap text-body">
                {row.name}
              </span>
            </div>
            <div
              className={`border-t border-l ${idx === lastIdx ? "border-b" : ""} flex h-[32px] w-[80px] items-center border-field-line p-[8px]`}
            >
              <span className="font-rubik text-[12px] leading-[14px] font-normal text-body">
                {row.activeJobs}
              </span>
            </div>
            <div
              className={`border-t border-r border-l ${idx === lastIdx ? "border-b" : ""} flex h-[32px] w-[80px] items-center border-field-line p-[8px]`}
            >
              <span className="font-rubik text-[12px] leading-[14px] font-normal text-body">
                {row.completedToday}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
