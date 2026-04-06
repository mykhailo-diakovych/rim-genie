import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

import type { TabValue } from "./types";

export function useInventoryJobs(tab: TabValue, dateFrom?: string) {
  return useQuery(
    orpc.inventory.jobs.list.queryOptions({
      input: { tab, dateFrom },
    }),
  );
}

export function useInventoryCounts(dateFrom?: string) {
  return useQuery(orpc.inventory.jobs.counts.queryOptions({ input: { dateFrom } }));
}

export function useInventoryRecords(filters?: { type?: "eod" | "sod"; hasDiscrepancy?: boolean }) {
  return useQuery(
    orpc.inventory.records.list.queryOptions({
      input: { type: filters?.type, hasDiscrepancy: filters?.hasDiscrepancy },
    }),
  );
}

export function useLatestRecords() {
  return useQuery(orpc.inventory.records.latest.queryOptions({}));
}
