import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export function useOvernightJobs() {
  return useQuery(
    orpc.inventory.jobs.list.queryOptions({
      input: { isOvernight: true },
    }),
  );
}

export function useUnfinishedJobs() {
  return useQuery(orpc.inventory.jobs.unfinished.queryOptions({}));
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
