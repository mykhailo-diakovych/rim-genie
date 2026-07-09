import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { type DateRange, getDateFrom, getDateTo } from "@/components/ui/date-range-filter";
import { orpc } from "@/utils/orpc";

import type { ApiJob, JobGroup } from "./types";

function groupJobsByInvoice(jobs: ApiJob[]): JobGroup[] {
  const map = new Map<string, JobGroup>();

  for (const job of jobs) {
    let group = map.get(job.invoiceId);
    if (!group) {
      group = {
        invoiceId: job.invoiceId,
        invoiceNumber: job.invoice.invoiceNumber,
        customer: job.invoice.customer.name,
        date: new Date(job.createdAt).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        assignee: job.technician?.name ?? null,
        startedAt: null,
        hoursSpent: null,
        jobs: [],
      };
      map.set(job.invoiceId, group);
    }
    group.jobs.push(job);
    if (!group.assignee && job.technician?.name) {
      group.assignee = job.technician.name;
    }
  }

  for (const group of map.values()) {
    const starts = group.jobs
      .map((j) => j.startedAt ?? j.acceptedAt)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => new Date(d).getTime());
    const ends = group.jobs
      .map((j) => j.completedAt)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => new Date(d).getTime());
    const start = starts.length > 0 ? Math.min(...starts) : null;
    const end = ends.length > 0 ? Math.max(...ends) : null;
    group.startedAt = start !== null ? new Date(start).toISOString() : null;
    group.hoursSpent =
      start !== null && end !== null ? Math.max(0, (end - start) / 3_600_000) : null;
  }

  return Array.from(map.values());
}

export function getGroupAction(group: JobGroup): "proofs" | "done" {
  return group.jobs.some((j) => j.status === "accepted") ? "proofs" : "done";
}

export function formatStartedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatHours(hours: number | null): string | null {
  if (hours === null) return null;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function filterGroupsByDateRange(groups: JobGroup[], dateRange: DateRange): JobGroup[] {
  const dateFrom = getDateFrom(dateRange);
  const dateTo = getDateTo(dateRange);
  if (!dateFrom && !dateTo) return groups;

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  return groups.filter((group) =>
    group.jobs.some((job) => {
      const created = new Date(job.createdAt);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    }),
  );
}

interface UseJobsParams {
  dateRange?: DateRange;
  technicianId?: string;
}

export function useJobs(params?: UseJobsParams) {
  const { dateRange = "all", technicianId: explicitTechnicianId = "" } = params ?? {};

  const technicianId = explicitTechnicianId || undefined;

  const { data, isLoading } = useQuery(
    orpc.technician.jobs.list.queryOptions({
      input: { technicianId: technicianId ?? undefined },
    }),
  );

  const groups = useMemo(() => {
    if (!data)
      return {
        assign: [] as JobGroup[],
        inProgress: [] as JobGroup[],
        completed: [] as JobGroup[],
      };

    const assignJobs: ApiJob[] = [];
    const inProgressJobs: ApiJob[] = [];
    const completedJobs: ApiJob[] = [];

    for (const job of data) {
      if (job.status === "completed") {
        completedJobs.push(job);
      } else if (job.status === "accepted" || job.status === "in_progress") {
        inProgressJobs.push(job);
      } else {
        assignJobs.push(job);
      }
    }

    return {
      assign: filterGroupsByDateRange(groupJobsByInvoice(assignJobs), dateRange),
      inProgress: filterGroupsByDateRange(groupJobsByInvoice(inProgressJobs), dateRange),
      completed: filterGroupsByDateRange(groupJobsByInvoice(completedJobs), dateRange),
    };
  }, [data, dateRange]);

  return { ...groups, isLoading };
}
