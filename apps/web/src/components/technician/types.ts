import type { AppRouterClient } from "@rim-genie/api/routers/index";

export type ApiJob = Awaited<ReturnType<AppRouterClient["technician"]["jobs"]["list"]>>[number];

export type JobGroup = {
  invoiceId: string;
  invoiceNumber: number;
  customer: string;
  date: string;
  assignee: string | null;
  jobs: ApiJob[];
};

export const TAB_CONFIG = [
  { value: "new", label: "New" },
  { value: "assign", label: "Assign" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export type TabValue = (typeof TAB_CONFIG)[number]["value"];
