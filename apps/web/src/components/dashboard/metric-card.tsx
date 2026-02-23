import type { SVGProps } from "react";
import type { TooltipContentProps } from "recharts";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

import { IconArrowDown, IconArrowUp } from "@/components/ui/nav-icons";
import { m } from "@/paraglide/messages";

const CHART_GREEN = "#21b84e";
const CHART_RED = "#f04438";

function SparklineTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[4px] bg-body px-2 py-1 shadow-sm">
      <span className="font-rubik text-[11px] leading-none text-white">{payload[0].value}</span>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  change: number;
  sparkline: number[];
  accentColor: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
}

export function MetricCard({
  title,
  subtitle,
  value,
  change,
  sparkline,
  accentColor,
  icon: Icon,
}: MetricCardProps) {
  const isPositive = change >= 0;
  const chartColor = isPositive ? CHART_GREEN : CHART_RED;
  const chartData = sparkline.map((v, i) => ({ i, v }));
  const gradientId = `grad-${title.replace(/\W+/g, "-")}`;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-card-line bg-white p-3 shadow-card">
      {/* Title row: icon circle + title/subtitle */}
      <div className="flex items-center gap-2">
        <div
          className="flex shrink-0 items-center justify-center rounded-full p-[6px]"
          style={{ backgroundColor: accentColor }}
        >
          <Icon className="size-6 text-white" />
        </div>
        <div className="flex flex-col leading-4.5">
          <span className="font-rubik text-sm font-medium text-body">{title}</span>
          <span className="font-rubik text-xs text-label">{subtitle}</span>
        </div>
      </div>

      {/* Bottom block: value+badge+label | chart */}
      <div className="flex items-start gap-3">
        {/* Left: value, badge, label */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="font-rubik text-[26px] leading-[30px] font-medium text-body">
              {value}
            </span>
            <span
              className="flex items-center gap-[2px] rounded-[4px] px-[2px] py-[3px] text-white"
              style={{
                backgroundColor: isPositive ? "var(--badge-green)" : "var(--badge-red)",
              }}
            >
              {isPositive ? (
                <IconArrowUp className="size-3" />
              ) : (
                <IconArrowDown className="size-3" />
              )}
              <span className="font-rubik text-xs leading-none">{Math.abs(change)}%</span>
            </span>
          </div>
          <span className="font-rubik text-xs leading-4.5 text-label">
            {m.metric_vs_last_period()}
          </span>
        </div>

        {/* Right: sparkline chart */}
        <div className="h-12 w-24 shrink-0 md:w-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip
                content={SparklineTooltip}
                cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={chartColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, fill: chartColor, stroke: "white", strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
