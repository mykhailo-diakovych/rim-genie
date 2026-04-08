import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { type DateRange, getDateFrom } from "@/components/ui/date-range-filter";
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
        jobs: [],
      };
      map.set(job.invoiceId, group);
    }
    group.jobs.push(job);
    if (!group.assignee && job.technician?.name) {
      group.assignee = job.technician.name;
    }
  }

  return Array.from(map.values());
}

export function getGroupAction(group: JobGroup): "proofs" | "done" {
  return group.jobs.some((j) => j.status === "accepted") ? "proofs" : "done";
}

function filterGroupsByDateRange(groups: JobGroup[], dateRange: DateRange): JobGroup[] {
  const dateFrom = getDateFrom(dateRange);
  if (!dateFrom) return groups;

  const from = new Date(dateFrom);
  return groups.filter((group) =>
    group.jobs.some((job) => new Date(job.createdAt) >= from),
  );
}

interface UseJobsParams {
  dateRange?: DateRange;
  technicianId?: string;
}

export function useJobs(params?: UseJobsParams) {
  const {
    dateRange = "all",
    technicianId: explicitTechnicianId = "",
  } = params ?? {};

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
