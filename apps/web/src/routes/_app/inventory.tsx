import { createFileRoute } from "@tanstack/react-router";

import { OvernightJobCard } from "@/components/inventory/overnight-job-card";
import { useOvernightJobs } from "@/components/inventory/use-inventory";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { data: overnightJobs, isLoading } = useOvernightJobs();

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
        List of Overnight Jobs
      </h1>
      {isLoading && <p className="font-rubik text-xs leading-3.5 text-label">Loading jobs...</p>}
      {!isLoading && (
        <div className="flex flex-col gap-2">
          {overnightJobs && overnightJobs.length > 0 ? (
            overnightJobs.map((job) => <OvernightJobCard key={job.id} job={job} />)
          ) : (
            <p className="font-rubik text-xs leading-3.5 text-label">No overnight jobs.</p>
          )}
        </div>
      )}
    </div>
  );
}
