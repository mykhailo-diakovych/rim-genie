import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

export interface CustomerCardData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthdayDay: number | null;
  birthdayMonth: number | null;
  isVip: boolean;
  discount: number | null;
  quotesCount: number;
  jobsCount: number;
}

interface CustomerCardProps {
  customer: CustomerCardData;
  actions: ReactNode;
}

export function CustomerCard({ customer, actions }: CustomerCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-4">
          <span className="font-rubik text-sm leading-4.5 font-medium text-body">
            {customer.name}
          </span>
          <div className="flex items-center gap-2 font-rubik text-xs leading-3.5 text-body">
            {customer.email && <span>{customer.email}</span>}
            {customer.email && customer.phone && <span className="size-1 rounded-full bg-body" />}
            {customer.phone && <span>{customer.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 font-rubik text-xs leading-3.5">
          <span className="text-label">{m.customers_label_quotes()}</span>
          <span className="text-body">{customer.quotesCount}</span>
          <span className="size-1 rounded-full bg-label" />
          <span className="text-label">{m.customers_label_jobs()}</span>
          <span className="text-body">{customer.jobsCount}</span>
        </div>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

export function CustomerCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-card-line bg-white p-3 shadow-card">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-4">
          <Skeleton className="h-[18px] w-32 rounded" />
          <Skeleton className="h-3.5 w-48 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-12 rounded" />
          <Skeleton className="size-1 rounded-full" />
          <Skeleton className="h-3.5 w-12 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-[72px] rounded-lg" />
        <Skeleton className="h-9 w-[72px] rounded-lg" />
      </div>
    </div>
  );
}
