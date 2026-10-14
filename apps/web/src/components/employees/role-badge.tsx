import type { UserRole } from "@rim-genie/db/schema";

import { m } from "@/paraglide/messages";

export const ROLE_LABELS: Record<UserRole, () => string> = {
  admin: m.employees_role_admin,
  floorManager: m.employees_role_floorManager,
  cashier: m.employees_role_cashier,
  technician: m.employees_role_technician,
  manager: m.employees_role_manager,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-badge-cyan",
  technician: "bg-blue",
  cashier: "bg-green",
  floorManager: "bg-badge-orange",
  manager: "bg-badge-magenta",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded ${ROLE_COLORS[role]} px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white`}
    >
      {ROLE_LABELS[role]()}
    </span>
  );
}
