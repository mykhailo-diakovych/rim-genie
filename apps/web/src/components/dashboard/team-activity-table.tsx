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
    <div className="rounded-[12px] border border-card-line bg-white overflow-hidden flex flex-col gap-[12px] p-[12px] shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <p className="font-rubik font-medium text-[14px] leading-[18px] text-body">
        {m.team_activity_title()}
      </p>
      <div className="flex flex-col w-full">
        {/* Header row */}
        <div className="flex w-full">
          <div className="border-l border-t border-field-line flex-1 min-w-0 h-[32px] flex items-center px-[8px] py-[7px]">
            <span className="font-rubik font-normal text-[12px] leading-[14px] text-label">
              {m.col_technician()}
            </span>
          </div>
          <div className="border-l border-t border-field-line w-[80px] h-[32px] flex items-center px-[8px] py-[7px]">
            <span className="font-rubik font-normal text-[12px] leading-[14px] text-label flex-1 min-w-0 whitespace-pre-wrap">
              {m.col_active_jobs()}
            </span>
          </div>
          <div className="border-l border-r border-t border-field-line w-[80px] h-[32px] flex items-center px-[8px] py-[7px]">
            <span className="font-rubik font-normal text-[12px] leading-[14px] text-label flex-1 min-w-0 whitespace-pre-wrap">
              {m.col_completed_today()}
            </span>
          </div>
        </div>
        {/* Data rows */}
        {rows.map((row, idx) => (
          <div key={row.name} className="flex w-full">
            <div
              className={`border-l border-t ${idx === lastIdx ? "border-b" : ""} border-field-line flex-1 min-w-0 h-[32px] flex items-center p-[8px]`}
            >
              <span className="font-rubik font-normal text-[12px] leading-[14px] text-body flex-1 min-w-0 whitespace-pre-wrap">
                {row.name}
              </span>
            </div>
            <div
              className={`border-l border-t ${idx === lastIdx ? "border-b" : ""} border-field-line w-[80px] h-[32px] flex items-center p-[8px]`}
            >
              <span className="font-rubik font-normal text-[12px] leading-[14px] text-body">
                {row.activeJobs}
              </span>
            </div>
            <div
              className={`border-l border-r border-t ${idx === lastIdx ? "border-b" : ""} border-field-line w-[80px] h-[32px] flex items-center p-[8px]`}
            >
              <span className="font-rubik font-normal text-[12px] leading-[14px] text-body">
                {row.completedToday}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
