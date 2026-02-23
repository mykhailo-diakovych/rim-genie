import type { ReactNode } from "react";

import type { UserRole } from "@rim-genie/db/schema";

import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

import { RoleBadge } from "./role-badge";

export interface EmployeeCardData {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
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

export function IconResetPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M14.333 8a6.333 6.333 0 1 1-5.527-6.333A6.333 6.333 0 0 1 13.806 5.467M14.333 3.667l-.316 2.116L12 5.333M6.667 7.333v-1a1.333 1.333 0 1 1 2.666 0v1M7.5 11h1c.782 0 1.173 0 1.442-.207a1 1 0 0 0 .185-.185c.206-.27.206-.66.206-1.441 0-.782 0-1.173-.206-1.442a1 1 0 0 0-.185-.185C9.673 7.333 9.282 7.333 8.5 7.333h-1c-.782 0-1.173 0-1.442.207a1 1 0 0 0-.185.185c-.206.27-.206.66-.206 1.442 0 .782 0 1.172.206 1.441a1 1 0 0 0 .185.185C6.327 11 6.718 11 7.5 11Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface EmployeeCardProps {
  employee: EmployeeCardData;
  actions: ReactNode;
}

export function EmployeeCard({ employee, actions }: EmployeeCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <span className="font-rubik text-sm leading-4.5 font-medium text-body">
            {employee.name}
          </span>
          {employee.role && <RoleBadge role={employee.role} />}
        </div>
        <div className="flex items-center gap-2 font-rubik text-xs leading-3.5">
          <span className="text-label">{m.employees_label_user_id()}</span>
          <span className="text-body">{employee.id.slice(0, 8)}</span>
          <span className="size-1 rounded-full bg-label" />
          <span className="text-label">{m.employees_label_email()}</span>
          <span className="text-body">{employee.email}</span>
        </div>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

export function EmployeeCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4.5 w-32 rounded" />
          <Skeleton className="h-4.5 w-20 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-36 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-18 rounded-lg" />
        <Skeleton className="h-9 w-26 rounded-lg" />
      </div>
    </div>
  );
}
