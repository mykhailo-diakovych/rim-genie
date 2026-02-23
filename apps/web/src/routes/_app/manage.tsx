import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/manage")({
  beforeLoad: ({ context }) => {
    if (context.session.user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
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
            <ServiceTableSkeleton />
          ) : services.length === 0 ? (
            <>
              <ServiceTableSkeleton rows={null} />
              <p className="py-10 text-center font-rubik text-sm text-label">{m.manage_empty()}</p>
            </>
          ) : (
            <>
              <ServiceTable
                services={services}
                onEdit={setEditService}
                onDelete={setDeleteConfirm}
                isDeleting={deleteService.isPending ? deleteService.variables?.id : undefined}
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

function ManagePage() {
  const [activeTab, setActiveTab] = useState<ServiceType>("rim");
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
          {m.manage_title()}
        </h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {m.manage_btn_add_service()}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ServiceType)}>
        <TabsList>
          {SERVICE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label()}
            </TabsTrigger>
          ))}
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
      </Tabs>
    </div>
  );
}
