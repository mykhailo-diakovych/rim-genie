import { redirect } from "@tanstack/react-router";

import type { UserRole } from "@rim-genie/db/schema";

const ROUTE_PERMISSIONS: Record<string, UserRole[] | null> = {
  "/dashboard": null,
  "/floor": ["admin", "floorManager"],
  "/cashier": ["admin", "cashier"],
  "/technician": ["admin", "technician"],
  "/inventory": ["admin", "inventoryClerk"],
  "/employees": ["admin"],
  "/customers": ["admin", "floorManager", "cashier"],
  "/manage": ["admin"],
  "/terms": null,
};

export function hasRouteAccess(route: string, role: UserRole | undefined): boolean {
  const allowedRoles = ROUTE_PERMISSIONS[route];
  if (allowedRoles === null || allowedRoles === undefined) return true;
  return !!role && allowedRoles.includes(role);
}

export function requireRoles(roles: UserRole[]) {
  return ({ context }: { context: { session: { user: { role?: string | null } } } }) => {
    const role = context.session.user.role;
    if (!role || !roles.includes(role as UserRole)) {
      throw redirect({ to: "/dashboard" });
    }
  };
}
