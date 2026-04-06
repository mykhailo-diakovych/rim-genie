import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import type { ServiceCategory } from "@rim-genie/db/schema";
import { serviceCategoryEnum } from "@rim-genie/db/schema";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

import { DeleteServiceModal } from "./delete-service-modal";
import { PricingModal } from "./pricing-modal";
import type { PricingRow } from "./pricing-modal";
import { IconDelete, IconEdit } from "./service-table";
import { ServicesPagination } from "./services-pagination";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  rim: "Rim",
  welding: "Welding",
  powder_coating: "Powder Coating",
  general: "General",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  truck: "Truck",
  car_suv: "Car/SUV",
  motorcycle: "Motorcycle",
};

const MATERIAL_LABELS: Record<string, string> = {
  steel: "Steel",
  aluminum: "Aluminum",
};

function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatJobType(jobType: string): string {
  return jobType
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PricingTab() {
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editPrice, setEditPrice] = useState<PricingRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PricingRow | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery(
    orpc.manage.pricing.list.queryOptions({
      input: {
        category: category || undefined,
        page,
        pageSize,
        search,
      },
    }),
  );

  const deleteMutation = useMutation({
    ...orpc.manage.pricing.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.manage.pricing.list.key() });
      toast.success("Price entry deleted");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={category}
              onValueChange={(val) => {
                setCategory((val as ServiceCategory) || "");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectPopup>
                <SelectOption value="">All categories</SelectOption>
                {serviceCategoryEnum.enumValues.map((cat) => (
                  <SelectOption key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectOption>
                ))}
              </SelectPopup>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by job type..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 pr-9 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost"
            />
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ghost" />
          </div>

          <Button className="ml-auto" onClick={() => setAddOpen(true)}>
            <Plus />
            Add Price
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-field-line bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="flex border-b border-field-line">
                <div className="flex w-28 items-center border-r border-field-line px-2 py-[7px]">
                  <span className="font-rubik text-xs leading-3.5 text-label">Category</span>
                </div>
                <div className="flex flex-1 items-center border-r border-field-line px-2 py-[7px]">
                  <span className="font-rubik text-xs leading-3.5 text-label">Job Type</span>
                </div>
                <div className="flex w-24 items-center border-r border-field-line px-2 py-[7px]">
                  <span className="font-rubik text-xs leading-3.5 text-label">Vehicle</span>
                </div>
                <div className="flex w-24 items-center border-r border-field-line px-2 py-[7px]">
                  <span className="font-rubik text-xs leading-3.5 text-label">Material</span>
                </div>
                <div className="flex w-24 items-center border-r border-field-line px-2 py-[7px]">
                  <span className="font-rubik text-xs leading-3.5 text-label">Size Range</span>
                </div>
                <div className="flex w-28 items-center border-r border-field-line px-2 py-[7px]">
                  <span className="font-rubik text-xs leading-3.5 text-label">Unit Cost</span>
                </div>
                <div className="h-8 w-[168px]" />
              </div>

              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex border-b border-field-line">
                    <div className="flex w-28 items-center border-r border-field-line p-2">
                      <Skeleton className="h-[18px] w-16 rounded" />
                    </div>
                    <div className="flex flex-1 items-center border-r border-field-line p-2">
                      <Skeleton className="h-[18px] w-24 rounded" />
                    </div>
                    <div className="flex w-24 items-center border-r border-field-line p-2">
                      <Skeleton className="h-[18px] w-14 rounded" />
                    </div>
                    <div className="flex w-24 items-center border-r border-field-line p-2">
                      <Skeleton className="h-[18px] w-14 rounded" />
                    </div>
                    <div className="flex w-24 items-center border-r border-field-line p-2">
                      <Skeleton className="h-[18px] w-14 rounded" />
                    </div>
                    <div className="flex w-28 items-center border-r border-field-line p-2">
                      <Skeleton className="h-[18px] w-16 rounded" />
                    </div>
                    <div className="flex items-center justify-end gap-2 p-2">
                      <Skeleton className="h-8 w-18 rounded-lg" />
                      <Skeleton className="h-8 w-18 rounded-lg" />
                    </div>
                  </div>
                ))
              ) : items.length === 0 ? (
                <p className="py-10 text-center font-rubik text-sm text-label">
                  No price entries yet. Add your first price.
                </p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex border-b border-field-line last:border-b-0">
                    <div className="flex w-28 items-center self-stretch border-r border-field-line p-2">
                      <span className="font-rubik text-sm leading-4.5 text-body">
                        {CATEGORY_LABELS[item.category as ServiceCategory] ?? item.category}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center self-stretch border-r border-field-line p-2">
                      <span className="font-rubik text-sm leading-4.5 text-body">
                        {formatJobType(item.jobType)}
                      </span>
                    </div>
                    <div className="flex w-24 items-center self-stretch border-r border-field-line p-2">
                      <span className="font-rubik text-sm leading-4.5 text-body">
                        {item.vehicleType
                          ? (VEHICLE_TYPE_LABELS[item.vehicleType] ?? item.vehicleType)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex w-24 items-center self-stretch border-r border-field-line p-2">
                      <span className="font-rubik text-sm leading-4.5 text-body capitalize">
                        {item.rimMaterial
                          ? (MATERIAL_LABELS[item.rimMaterial] ?? item.rimMaterial)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex w-24 items-center self-stretch border-r border-field-line p-2">
                      <span className="font-rubik text-sm leading-4.5 text-body">
                        {item.minSize != null && item.maxSize != null
                          ? `${item.minSize}"–${item.maxSize}"`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex w-28 items-center self-stretch border-r border-field-line p-2">
                      <span className="font-rubik text-sm leading-4.5 text-body">
                        {formatUSD(item.unitCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 self-stretch p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-18"
                        onClick={() =>
                          setEditPrice({
                            id: item.id,
                            category: item.category as ServiceCategory,
                            jobType: item.jobType,
                            vehicleType: item.vehicleType,
                            rimMaterial: item.rimMaterial,
                            minSize: item.minSize,
                            maxSize: item.maxSize,
                            unitCost: item.unitCost,
                          })
                        }
                      >
                        <IconEdit />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        color="destructive"
                        size="sm"
                        className="w-18"
                        onClick={() =>
                          setDeleteConfirm({
                            id: item.id,
                            category: item.category as ServiceCategory,
                            jobType: item.jobType,
                            vehicleType: item.vehicleType,
                            rimMaterial: item.rimMaterial,
                            minSize: item.minSize,
                            maxSize: item.maxSize,
                            unitCost: item.unitCost,
                          })
                        }
                        disabled={
                          deleteMutation.isPending && deleteMutation.variables?.id === item.id
                        }
                      >
                        <IconDelete />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {!isLoading && items.length > 0 && (
            <div className="border-t border-field-line">
              <ServicesPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <PricingModal
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultCategory={category || undefined}
      />

      <PricingModal
        open={!!editPrice}
        onOpenChange={(open) => {
          if (!open) setEditPrice(null);
        }}
        price={editPrice ?? undefined}
      />

      <DeleteServiceModal
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        serviceName={deleteConfirm ? `${formatJobType(deleteConfirm.jobType)} price entry` : ""}
        onConfirm={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm.id })}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
