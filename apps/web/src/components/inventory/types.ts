import type { AppRouterClient } from "@rim-genie/api/routers/index";

export type ApiJob = Awaited<ReturnType<AppRouterClient["inventory"]["jobs"]["list"]>>[number];

export type ApiRecord = Awaited<
  ReturnType<AppRouterClient["inventory"]["records"]["list"]>
>[number];

export type LatestRecords = Awaited<ReturnType<AppRouterClient["inventory"]["records"]["latest"]>>;

export const TAB_CONFIG = [
  { value: "overnight", label: "Overnight" },
  { value: "readyForPickup", label: "Ready For Pickup" },
  { value: "outstandingBalance", label: "Outstanding Balance" },
  { value: "missing", label: "Missing" },
  { value: "pickedUp", label: "Picked Up" },
] as const;

export type TabValue = (typeof TAB_CONFIG)[number]["value"];
