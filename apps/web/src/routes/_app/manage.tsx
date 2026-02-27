import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import type { ServiceType } from "@rim-genie/db/schema";

import { DeleteServiceModal } from "@/components/manage/delete-service-modal";
import { ServiceModal } from "@/components/manage/service-modal";
import { ServiceTable, ServiceTableSkeleton } from "@/components/manage/service-table";
import type { ServiceRow } from "@/components/manage/service-table";
import { ServicesPagination } from "@/components/manage/services-pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRoles } from "@/lib/route-permissions";
import { m } from "@/paraglide/messages";
import { client, orpc } from "@/utils/orpc";

type ManageTab = ServiceType | "loyalty";

export const Route = createFileRoute("/_app/manage")({
  validateSearch: (search: Record<string, unknown>): { tab: ManageTab } => ({
    tab: (["rim", "general", "loyalty"] as const).includes(search.tab as ManageTab)
      ? (search.tab as ManageTab)
      : "rim",
  }),
  beforeLoad: requireRoles(["admin"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Manage" }],
  }),
  component: ManagePage,
});

const SERVICE_TABS: { value: ServiceType; label: () => string }[] = [
  { value: "rim", label: () => m.manage_tab_rim() },
  { value: "general", label: () => m.manage_tab_general() },
];

interface ServicesTabProps {
  type: ServiceType;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}

function ServicesTab({ type, addOpen, onAddOpenChange }: ServicesTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceRow | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery(
    orpc.manage.services.list.queryOptions({ input: { type, page, pageSize, search } }),
  );

  const deleteService = useMutation({
    ...orpc.manage.services.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.manage.services.list.key() });
      toast.success(m.manage_toast_deleted());
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const services = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative w-80">
          <input
            type="text"
            placeholder={m.manage_search_placeholder()}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 pr-9 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost"
          />
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ghost" />
        </div>

        <div className="overflow-hidden rounded-lg border border-field-line bg-white">
          {isLoading ? (
            <ServiceTableSkeleton showVehicleType={type === "general"} />
          ) : services.length === 0 ? (
            <>
              <ServiceTableSkeleton rows={null} showVehicleType={type === "general"} />
              <p className="py-10 text-center font-rubik text-sm text-label">{m.manage_empty()}</p>
            </>
          ) : (
            <>
              <ServiceTable
                services={services}
                onEdit={setEditService}
                onDelete={setDeleteConfirm}
                isDeleting={deleteService.isPending ? deleteService.variables?.id : undefined}
                showVehicleType={type === "general"}
              />
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
            </>
          )}
        </div>
      </div>

      <ServiceModal open={addOpen} onOpenChange={onAddOpenChange} serviceType={type} />

      <ServiceModal
        open={!!editService}
        onOpenChange={(open) => {
          if (!open) setEditService(null);
        }}
        serviceType={type}
        service={editService ?? undefined}
      />

      <DeleteServiceModal
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        serviceName={deleteConfirm?.name ?? ""}
        onConfirm={() => deleteConfirm && deleteService.mutate({ id: deleteConfirm.id })}
        isPending={deleteService.isPending}
      />
    </>
  );
}

function LoyaltyTab() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery(orpc.loyalty.config.get.queryOptions());

  const [purchaseThreshold, setPurchaseThreshold] = useState("");
  const [spendThreshold, setSpendThreshold] = useState("");
  const [rewardPercent, setRewardPercent] = useState("");

  useEffect(() => {
    if (config) {
      setPurchaseThreshold(String(config.purchaseThreshold));
      setSpendThreshold(String(config.spendThreshold / 100));
      setRewardPercent(String(config.rewardPercent));
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (input: {
      purchaseThreshold: number;
      spendThreshold: number;
      rewardPercent: number;
    }) => client.loyalty.config.update(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.loyalty.config.get.key() });
      toast.success(m.loyalty_toast_updated());
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    const pt = Number.parseInt(purchaseThreshold, 10);
    const st = Math.round(Number.parseFloat(spendThreshold) * 100);
    const rp = Number.parseInt(rewardPercent, 10);

    if (Number.isNaN(pt) || pt < 1) return;
    if (Number.isNaN(st) || st < 1) return;
    if (Number.isNaN(rp) || rp < 1 || rp > 100) return;

    updateMutation.mutate({ purchaseThreshold: pt, spendThreshold: st, rewardPercent: rp });
  };

  if (isLoading) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-page" />
        <div className="h-10 w-full animate-pulse rounded-md bg-page" />
        <div className="h-10 w-full animate-pulse rounded-md bg-page" />
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-rubik text-sm leading-4.5 text-body">
          {m.loyalty_purchase_threshold()}
        </label>
        <input
          type="number"
          min={1}
          value={purchaseThreshold}
          onChange={(e) => setPurchaseThreshold(e.target.value)}
          className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 font-rubik text-sm text-body outline-none placeholder:text-ghost"
        />
        <span className="font-rubik text-xs leading-3.5 text-label">
          {m.loyalty_purchase_threshold_desc()}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-rubik text-sm leading-4.5 text-body">
          {m.loyalty_spend_threshold()}
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={spendThreshold}
          onChange={(e) => setSpendThreshold(e.target.value)}
          className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 font-rubik text-sm text-body outline-none placeholder:text-ghost"
        />
        <span className="font-rubik text-xs leading-3.5 text-label">
          {m.loyalty_spend_threshold_desc()}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-rubik text-sm leading-4.5 text-body">
          {m.loyalty_reward_percent()}
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={rewardPercent}
          onChange={(e) => setRewardPercent(e.target.value)}
          className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 font-rubik text-sm text-body outline-none placeholder:text-ghost"
        />
        <span className="font-rubik text-xs leading-3.5 text-label">
          {m.loyalty_reward_percent_desc()}
        </span>
      </div>

      <Button className="self-start" disabled={updateMutation.isPending} onClick={handleSave}>
        {updateMutation.isPending ? "Saving..." : m.btn_save()}
      </Button>
    </div>
  );
}

function ManagePage() {
  const { tab: activeTab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [addOpen, setAddOpen] = useState(false);

  const isServiceTab = activeTab === "rim" || activeTab === "general";

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
          {m.manage_title()}
        </h1>
        {isServiceTab && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            {m.manage_btn_add_service()}
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => navigate({ search: { tab: val as ManageTab } })}
      >
        <TabsList>
          {SERVICE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label()}
            </TabsTrigger>
          ))}
          <TabsTrigger value="loyalty">{m.loyalty_tab()}</TabsTrigger>
        </TabsList>

        {SERVICE_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="pt-3">
            <ServicesTab
              type={tab.value}
              addOpen={activeTab === tab.value && addOpen}
              onAddOpenChange={(open) => setAddOpen(open)}
            />
          </TabsContent>
        ))}

        <TabsContent value="loyalty" className="pt-3">
          <LoyaltyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
