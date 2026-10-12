import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

import type { TabValue } from "./types";

interface InventoryJobFilter {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useInventoryJobs(tab: TabValue, filter: InventoryJobFilter) {
  return useQuery({
    ...orpc.inventory.jobs.list.queryOptions({ input: { tab, ...filter } }),
    placeholderData: keepPreviousData,
  });
}

export function useInventoryCounts(filter: InventoryJobFilter) {
  return useQuery({
    ...orpc.inventory.jobs.counts.queryOptions({ input: filter }),
    placeholderData: keepPreviousData,
  });
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
