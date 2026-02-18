import { IconAlert, IconArrowRight, IconDiscount } from "@/components/ui/nav-icons";
import { m } from "@/paraglide/messages";

type Severity = "high" | "medium";

interface AttentionItem {
  id: string;
  label: string;
  count: number;
  severity: Severity;
}

interface AttentionRequiredCardProps {
  items: AttentionItem[];
}

const SEVERITY_STYLE: Record<Severity, { iconBg: string; badgeColor: string }> = {
  high: { iconBg: "#db3e21", badgeColor: "#ee3f3f" },
  medium: { iconBg: "#f9b62e", badgeColor: "#f9b62e" },
};

const LABEL_MAP: Record<string, () => string> = {
  attention_overdue_jobs: m.attention_overdue_jobs,
  attention_low_inventory: m.attention_low_inventory,
  attention_unassigned_jobs: m.attention_unassigned_jobs,
  attention_pending_invoices: m.attention_pending_invoices,
};

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === "high") {
    return <IconAlert className="size-3 text-white" />;
  }
  return <IconDiscount className="size-3 text-white" />;
}

export function AttentionRequiredCard({ items }: AttentionRequiredCardProps) {
  return (
    <div className="rounded-[12px] border border-[rgba(219,62,33,0.5)] bg-white overflow-hidden flex flex-col gap-[12px] p-[12px] shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <p className="font-rubik font-medium text-[14px] leading-[18px] text-body">
        {m.attention_required_title()}
      </p>
      <div className="flex flex-col gap-[8px] w-full">
        {items.map((item, idx) => {
          const style = SEVERITY_STYLE[item.severity];
          const labelFn = LABEL_MAP[item.label];
          return (
            <div key={item.id} className="flex flex-col gap-[8px]">
              <div className="flex gap-[12px] items-center w-full">
                <div className="flex flex-1 min-w-0 gap-[4px] items-center">
                  <div
                    className="flex items-center p-[4px] rounded-full shrink-0"
                    style={{ backgroundColor: style.iconBg }}
                  >
                    <SeverityIcon severity={item.severity} />
                  </div>
                  <p className="flex-1 min-w-0 font-rubik font-normal text-[12px] leading-[14px] text-body whitespace-pre-wrap">
                    {labelFn ? labelFn() : item.label}
                  </p>
                </div>
                <div
                  className="flex gap-[2px] items-center justify-center border rounded-[4px] w-[36px] pl-[4px] py-[3px] shrink-0"
                  style={{ borderColor: style.badgeColor, color: style.badgeColor }}
                >
                  <span className="font-rubik font-normal text-[12px] text-center leading-none">
                    {item.count}
                  </span>
                  <IconArrowRight className="size-3" />
                </div>
              </div>
              {idx < items.length - 1 && (
                <div className="bg-[rgba(219,62,33,0.08)] h-px w-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
