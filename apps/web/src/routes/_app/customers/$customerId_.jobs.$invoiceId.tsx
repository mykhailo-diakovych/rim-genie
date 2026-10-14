import { createFileRoute } from "@tanstack/react-router";

import { CustomerJobView } from "@/components/customers/customer-job-view";
import { requireRoles } from "@/lib/route-permissions";

export const Route = createFileRoute("/_app/customers/$customerId_/jobs/$invoiceId")({
  beforeLoad: requireRoles(["admin", "floorManager", "cashier", "manager"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Job" }],
  }),
  component: CustomerJobPage,
});

function CustomerJobPage() {
  const { customerId, invoiceId } = Route.useParams();
  return <CustomerJobView customerId={customerId} invoiceId={invoiceId} />;
}
