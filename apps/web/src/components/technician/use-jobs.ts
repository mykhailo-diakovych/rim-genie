import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

import type { DateFilter, OwnerFilter } from "./filter-row";
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

function getDateRange(dateFilter: DateFilter): { start: Date; end: Date } | null {
  if (!dateFilter) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  if (dateFilter === "today") {
    return { start: startOfDay, end: endOfDay };
  }

  if (dateFilter === "week") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    return { start: startOfWeek, end: endOfWeek };
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: startOfMonth, end: endOfMonth };
}

function filterGroupsByDate(groups: JobGroup[], dateFilter: DateFilter): JobGroup[] {
  const range = getDateRange(dateFilter);
  if (!range) return groups;

  return groups.filter((group) =>
    group.jobs.some((job) => {
      const created = new Date(job.createdAt);
      return created >= range.start && created < range.end;
    }),
  );
}

interface UseJobsParams {
  ownerFilter?: OwnerFilter;
  dateFilter?: DateFilter;
}

export function useJobs(params?: UseJobsParams) {
  const { ownerFilter = "all", dateFilter = "" } = params ?? {};
  const { data: session } = authClient.useSession();

  const technicianId = ownerFilter === "mine" ? session?.user?.id : undefined;

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

    const allGroups = groupJobsByInvoice(data);

    const assign: JobGroup[] = [];
    const inProgress: JobGroup[] = [];
    const completed: JobGroup[] = [];

    for (const group of allGroups) {
      const statuses = group.jobs.map((j) => j.status);
      if (statuses.every((s) => s === "completed")) {
        completed.push(group);
      } else if (statuses.some((s) => s === "accepted" || s === "in_progress")) {
        inProgress.push(group);
      } else if (statuses.every((s) => s === "pending")) {
        assign.push(group);
      }
    }

    return {
      assign: filterGroupsByDate(assign, dateFilter),
      inProgress: filterGroupsByDate(inProgress, dateFilter),
      completed: filterGroupsByDate(completed, dateFilter),
    };
  }, [data, dateFilter]);

  return { ...groups, isLoading };
}
