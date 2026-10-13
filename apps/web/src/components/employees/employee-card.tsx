import type { ReactNode } from "react";

import { isPlaceholderEmail } from "@rim-genie/db/employee-email";
import type { UserRole } from "@rim-genie/db/schema";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { RoleBadge } from "./role-badge";

export interface EmployeeCardData {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: UserRole | null;
  banned: boolean | null;
  canAdjustPrices?: boolean;
  locations?: { id: string; name: string }[];
  neverSignedIn?: boolean;
}

export type EmployeeStatus = "active" | "pendingInvite" | "deactivated";

export function getEmployeeStatus(employee: EmployeeCardData): EmployeeStatus {
  if (employee.banned === true) return "deactivated";
  if (employee.neverSignedIn) return "pendingInvite";
  return "active";
}

export function IconEdit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M9.333 4L12 6.667M2 14l.521-3.127a2.667 2.667 0 0 1 .738-1.434l7.052-7.052a1.32 1.32 0 0 1 1.868 0l1.434 1.434a1.32 1.32 0 0 1 0 1.868L6.561 12.74a2.667 2.667 0 0 1-1.434.738L2 14Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const AVATAR_TINTS: Record<UserRole, string> = {
  admin: "bg-badge-cyan/15",
  technician: "bg-blue/10",
  cashier: "bg-green/10",
  floorManager: "bg-badge-orange/10",
  inventoryClerk: "bg-badge-magenta/10",
};

const STATUS_STYLES: Record<EmployeeStatus, { dot: string; pill: string; label: () => string }> = {
  active: {
    dot: "bg-green",
    pill: "bg-green/10 text-badge-green",
    label: m.employees_status_active,
  },
  pendingInvite: {
    dot: "bg-badge-orange",
    pill: "bg-badge-orange/10 text-badge-orange",
    label: m.employees_status_pending_invite,
  },
  deactivated: {
    dot: "bg-red",
    pill: "bg-error-50 text-destructive",
    label: m.employees_badge_deactivated,
  },
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function EmployeeAvatar({ name, role }: { name: string; role: UserRole | null }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full font-rubik text-base font-medium text-body",
        role ? AVATAR_TINTS[role] : "bg-page",
      )}
    >
      {getInitials(name)}
    </span>
  );
}

function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
      <span className={cn("rounded-sm px-2 py-0.5 font-rubik text-xs leading-4", style.pill)}>
        {style.label()}
      </span>
    </span>
  );
}

function InfoColumn({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 lg:border-l lg:border-card-line lg:pl-5",
        className,
      )}
    >
      <span className="font-rubik text-xs leading-3.5 text-label">{label}</span>
      {children}
    </div>
  );
}

function formatLocations(locations: { id: string; name: string }[]) {
  if (locations.length === 0) return null;
  if (locations.length <= 2) return locations.map((l) => l.name).join(", ");
  return m.location_count({ count: locations.length });
}

interface EmployeeCardProps {
  employee: EmployeeCardData;
  actions: ReactNode;
}

export function EmployeeCard({ employee, actions }: EmployeeCardProps) {
  const status = getEmployeeStatus(employee);
  const hasEmail = !isPlaceholderEmail(employee.email);
  const locations = employee.locations ?? [];
  const locationLabel = formatLocations(locations);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-card-line bg-white p-4 shadow-card lg:flex-row lg:items-center lg:gap-5">
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-5",
          status === "deactivated" && "opacity-60",
        )}
      >
        <div className="flex min-w-0 items-center gap-3 lg:w-72 lg:shrink-0">
          <EmployeeAvatar name={employee.name} role={employee.role} />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-rubik text-base leading-5 font-medium text-body">
                {employee.name}
              </span>
              {employee.role && <RoleBadge role={employee.role} />}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 font-rubik text-xs leading-3.5">
              <span className="shrink-0 text-label">{m.employees_label_employee_id()}</span>
              <span className="truncate text-body">
                {employee.username ?? employee.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:gap-5">
          <InfoColumn label={m.employees_column_email()} className="lg:flex-1">
            <span
              className={cn(
                "truncate font-rubik text-sm leading-5",
                hasEmail ? "text-body" : "text-label",
              )}
            >
              {hasEmail ? employee.email : m.employees_email_not_provided()}
            </span>
          </InfoColumn>
          <InfoColumn label={m.employees_column_location()} className="lg:w-44 lg:shrink-0">
            <span
              title={locations.length > 2 ? locations.map((l) => l.name).join(", ") : undefined}
              className={cn(
                "truncate font-rubik text-sm leading-5",
                locationLabel ? "text-body" : "text-label",
              )}
            >
              {locationLabel ?? m.employees_location_none()}
            </span>
          </InfoColumn>
          <InfoColumn label={m.employees_column_status()} className="lg:w-44 lg:shrink-0">
            <EmployeeStatusBadge status={status} />
          </InfoColumn>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>
    </div>
  );
}

export function EmployeeCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-card-line bg-white p-4 shadow-card lg:flex-row lg:items-center lg:gap-5">
      <div className="flex items-center gap-3 lg:w-72 lg:shrink-0">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:gap-5">
        <Skeleton className="h-10 rounded lg:flex-1" />
        <Skeleton className="h-10 rounded lg:w-44" />
        <Skeleton className="h-10 rounded lg:w-44" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
    </div>
  );
}
