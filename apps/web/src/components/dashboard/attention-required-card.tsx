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
    <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-[rgba(219,62,33,0.5)] bg-white p-3 shadow-card">
      <p className="font-rubik text-sm leading-4.5 font-medium text-body">
        {m.attention_required_title()}
      </p>
      <div className="flex w-full flex-col gap-[8px]">
        {items.map((item, idx) => {
          const style = SEVERITY_STYLE[item.severity];
          const labelFn = LABEL_MAP[item.label];
          return (
            <div key={item.id} className="flex flex-col gap-[8px]">
              <div className="flex w-full items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-[4px]">
                  <div
                    className="flex shrink-0 items-center rounded-full p-[4px]"
                    style={{ backgroundColor: style.iconBg }}
                  >
                    <SeverityIcon severity={item.severity} />
                  </div>
                  <p className="min-w-0 flex-1 font-rubik text-xs leading-3.5 font-normal whitespace-pre-wrap text-body">
                    {labelFn ? labelFn() : item.label}
                  </p>
                </div>
                <div
                  className="flex w-[36px] shrink-0 items-center justify-center gap-[2px] rounded-[4px] border py-[3px] pl-[4px]"
                  style={{ borderColor: style.badgeColor, color: style.badgeColor }}
                >
                  <span className="text-center font-rubik text-xs leading-none font-normal">
                    {item.count}
                  </span>
                  <IconArrowRight className="size-3" />
                </div>
              </div>
              {idx < items.length - 1 && <div className="h-px w-full bg-[rgba(219,62,33,0.08)]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
