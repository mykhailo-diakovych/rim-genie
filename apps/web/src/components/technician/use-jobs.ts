import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

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

export function useJobs() {
  const { data, isLoading } = useQuery(orpc.technician.jobs.list.queryOptions({ input: {} }));

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

    return { assign, inProgress, completed };
  }, [data]);

  return { ...groups, isLoading };
}
