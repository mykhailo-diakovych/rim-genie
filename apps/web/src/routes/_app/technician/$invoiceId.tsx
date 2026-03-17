import { useMemo } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { requireRoles } from "@/lib/route-permissions";
import { AssignDetailView } from "@/components/technician/assign-detail-view";
import { CompletedDetailView } from "@/components/technician/completed-detail-view";
import { JobDetailView } from "@/components/technician/job-detail-view";
import type { TabValue } from "@/components/technician/types";
import { useJobs } from "@/components/technician/use-jobs";

const VALID_SOURCES = ["assign", "in-progress", "completed"] as const;
type Source = (typeof VALID_SOURCES)[number];

export const Route = createFileRoute("/_app/technician/$invoiceId")({
  validateSearch: (search: Record<string, unknown>): { source: Source } => ({
    source: VALID_SOURCES.includes(search.source as Source)
      ? (search.source as Source)
      : "in-progress",
  }),
  beforeLoad: requireRoles(["admin", "technician"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Job Details" }],
  }),
  component: TechnicianDetailPage,
});

function TechnicianDetailPage() {
  const { invoiceId } = Route.useParams();
  const { source } = Route.useSearch();
  const navigate = useNavigate();
  const { assign, inProgress, completed } = useJobs();

  const group = useMemo(() => {
    const sourceMap = { assign, "in-progress": inProgress, completed };
    return sourceMap[source].find((g) => g.invoiceId === invoiceId) ?? null;
  }, [source, assign, inProgress, completed, invoiceId]);

  const onBack = () =>
    void navigate({
      to: "/technician",
      search: { tab: source as TabValue },
    });

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center p-5">
        <p className="font-rubik text-sm text-label">Loading job details...</p>
      </div>
    );
  }

  if (source === "assign") {
    return <AssignDetailView group={group} onBack={onBack} />;
  }
  if (source === "completed") {
    return <CompletedDetailView group={group} onBack={onBack} />;
  }
  return <JobDetailView group={group} onBack={onBack} />;
}
