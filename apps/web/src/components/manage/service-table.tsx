import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

export interface ServiceRow {
  id: string;
  name: string;
  vehicleType: string | null;
  minSize: string;
  maxSize: string;
  unitCost: number;
}

function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
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

export function IconDelete({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ServiceTableProps {
  services: ServiceRow[];
  onEdit: (service: ServiceRow) => void;
  onDelete: (service: ServiceRow) => void;
  isDeleting?: string;
}

export function ServiceTable({ services, onEdit, onDelete, isDeleting }: ServiceTableProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white">
      <div className="flex border-b border-field-line">
        <div className="flex w-22 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_label_vehicle_type()}
          </span>
        </div>
        <div className="flex flex-1 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_service_name()}
          </span>
        </div>
        <div className="flex w-20 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_min_size()}
          </span>
        </div>
        <div className="flex w-20 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_max_size()}
          </span>
        </div>
        <div className="flex w-28 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_unit_cost()}
          </span>
        </div>
        <div className="h-8 w-[168px]" />
      </div>

      {services.map((svc) => (
        <div key={svc.id} className="flex border-b border-field-line last:border-b-0">
          <div className="flex w-22 items-center self-stretch border-r border-field-line p-2">
            <span className="font-rubik text-sm leading-4.5 text-body">
              {svc.vehicleType ?? "—"}
            </span>
          </div>
          <div className="flex flex-1 items-center self-stretch border-r border-field-line p-2">
            <span className="font-rubik text-sm leading-4.5 text-body">{svc.name}</span>
          </div>
          <div className="flex w-20 items-center self-stretch border-r border-field-line p-2">
            <span className="font-rubik text-sm leading-4.5 text-body">{svc.minSize}</span>
          </div>
          <div className="flex w-20 items-center self-stretch border-r border-field-line p-2">
            <span className="font-rubik text-sm leading-4.5 text-body">{svc.maxSize}</span>
          </div>
          <div className="flex w-28 items-center self-stretch border-r border-field-line p-2">
            <span className="font-rubik text-sm leading-4.5 text-body">
              {formatUSD(svc.unitCost)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 self-stretch p-2">
            <Button variant="outline" size="sm" className="w-18" onClick={() => onEdit(svc)}>
              <IconEdit />
              {m.employees_btn_edit()}
            </Button>
            <Button
              variant="outline"
              color="destructive"
              size="sm"
              className="w-18"
              onClick={() => onDelete(svc)}
              disabled={isDeleting === svc.id}
            >
              <IconDelete />
              {m.manage_btn_delete()}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex border-b border-field-line">
      <div className="flex w-22 items-center border-r border-field-line p-2">
        <Skeleton className="h-[18px] w-14 rounded" />
      </div>
      <div className="flex flex-1 items-center border-r border-field-line p-2">
        <Skeleton className="h-[18px] w-32 rounded" />
      </div>
      <div className="flex w-20 items-center border-r border-field-line p-2">
        <Skeleton className="h-[18px] w-12 rounded" />
      </div>
      <div className="flex w-20 items-center border-r border-field-line p-2">
        <Skeleton className="h-[18px] w-12 rounded" />
      </div>
      <div className="flex w-28 items-center border-r border-field-line p-2">
        <Skeleton className="h-[18px] w-20 rounded" />
      </div>
      <div className="flex items-center justify-end gap-2 p-2">
        <Skeleton className="h-8 w-18 rounded-lg" />
        <Skeleton className="h-8 w-18 rounded-lg" />
      </div>
    </div>
  );
}

export function ServiceTableSkeleton({ rows }: { rows?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white">
      <div className="flex border-b border-field-line">
        <div className="flex w-22 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_label_vehicle_type()}
          </span>
        </div>
        <div className="flex flex-1 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_service_name()}
          </span>
        </div>
        <div className="flex w-20 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_min_size()}
          </span>
        </div>
        <div className="flex w-20 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_max_size()}
          </span>
        </div>
        <div className="flex w-28 items-center border-r border-field-line px-2 py-[7px]">
          <span className="font-rubik text-xs leading-3.5 text-label">
            {m.manage_col_unit_cost()}
          </span>
        </div>
        <div className="h-8 w-[168px]" />
      </div>
      {rows !== undefined
        ? rows
        : Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
    </div>
  );
}
