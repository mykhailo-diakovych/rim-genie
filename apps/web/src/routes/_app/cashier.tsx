import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireRoles } from "@/lib/route-permissions";

export const Route = createFileRoute("/_app/cashier")({
  beforeLoad: requireRoles(["admin", "cashier"]),
  component: () => <Outlet />,
});
