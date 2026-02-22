import type { AppRouterClient } from "@rim-genie/api/routers/index";

export type ApiJob = Awaited<ReturnType<AppRouterClient["inventory"]["jobs"]["list"]>>[number];

export type ApiRecord = Awaited<
  ReturnType<AppRouterClient["inventory"]["records"]["list"]>
>[number];

export type LatestRecords = Awaited<ReturnType<AppRouterClient["inventory"]["records"]["latest"]>>;

export const TAB_CONFIG = [
  { value: "overnight", label: "Overnight Jobs" },
  { value: "eod", label: "End of Day" },
  { value: "sod", label: "Start of Day" },
  { value: "history", label: "History" },
] as const;

export type TabValue = (typeof TAB_CONFIG)[number]["value"];
