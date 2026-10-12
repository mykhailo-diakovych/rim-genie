import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { InvoiceCard, InvoiceCardSkeleton } from "@/components/cashier/invoice-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DateRangeFilter,
  getDateFrom,
  getDateTo,
  parseDateRange,
  type DateRange,
} from "@/components/ui/date-range-filter";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistedState } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const TAB_VALUES = ["unpaid", "partially", "paid"] as const;
type InvoiceTab = (typeof TAB_VALUES)[number];

const TAB_LABELS: Record<InvoiceTab, string> = {
  unpaid: "Unpaid",
  partially: "Partially Paid",
  paid: "Paid",
};

export const Route = createFileRoute("/_app/cashier/")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Cashier" }],
  }),
  component: CashierPage,
});

function TabCounter({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-7 items-center justify-center rounded-full px-1 font-rubik text-xs leading-3.5",
        active ? "bg-blue text-white" : "bg-[#e2e4e5] text-label",
      )}
    >
      {count}
    </span>
  );
}

function CashierPage() {
  const [tab, setTab] = usePersistedState<InvoiceTab>("cashier.tab", "unpaid", (v) =>
    TAB_VALUES.includes(v as InvoiceTab) ? (v as InvoiceTab) : null,
  );
  const [dateRange, setDateRange] = usePersistedState<DateRange>("cashier.dateRange", "30d", (v) =>
    parseDateRange(v, "30d"),
  );
  const queryClient = useQueryClient();

  const dateFrom = getDateFrom(dateRange);
  const dateTo = getDateTo(dateRange);

  const unpaidQuery = useQuery(
    orpc.cashier.invoices.list.queryOptions({
      input: { status: "unpaid", dateFrom, dateTo },
    }),
  );
  const partiallyQuery = useQuery(
    orpc.cashier.invoices.list.queryOptions({
      input: { status: "partially_paid", dateFrom, dateTo },
    }),
  );
  const paidQuery = useQuery(
    orpc.cashier.invoices.list.queryOptions({
      input: { status: "paid", dateFrom, dateTo },
    }),
  );

  const queries = { unpaid: unpaidQuery, partially: partiallyQuery, paid: paidQuery };
  const currentQuery = queries[tab];
  const invoices = currentQuery.data?.rows ?? [];
  const isLoading = currentQuery.isLoading;

  const counts = {
    unpaid: unpaidQuery.data?.total ?? 0,
    partially: partiallyQuery.data?.total ?? 0,
    paid: paidQuery.data?.total ?? 0,
  };

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const deleteInvoice = useMutation({
    ...orpc.cashier.invoices.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.cashier.invoices.list.key() });
      toast.success("Invoice deleted");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  return (
    <div className="flex flex-col px-3 pt-4 pb-5 sm:px-5">
      <Tabs value={tab} onValueChange={(value) => setTab(value as InvoiceTab)}>
        {/* Header + tabs pinned so switching status never means scrolling back up. */}
        <div className="z-10 -mx-3 -mt-4 flex flex-col gap-4 bg-background px-3 pt-4 pb-3 sm:-mx-5 sm:px-5 md:sticky md:top-0">
          <PageHeader
            title="Invoices"
            description="Manage finalized invoices, process customer payments, and complete transactions."
            actions={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
          />

          <TabsList>
            {TAB_VALUES.map((value) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                {TAB_LABELS[value]}
                <TabCounter count={counts[value]} active={tab === value} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TAB_VALUES.map((value) => (
          <TabsContent key={value} value={value}>
            <div className="flex flex-col gap-2 pt-2">
              {isLoading && tab === value ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <InvoiceCardSkeleton key={`skeleton-${i}`} />
                ))
              ) : (
                <>
                  {invoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      onDelete={() => setDeleteConfirm(invoice.id)}
                    />
                  ))}
                  {invoices.length === 0 && (
                    <p className="py-8 text-center font-rubik text-sm text-label">
                      No invoices found
                    </p>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title="Delete invoice"
        description={
          <>
            Are you sure you want to delete this invoice?
            <br />
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && deleteInvoice.mutate({ id: deleteConfirm })}
        isPending={deleteInvoice.isPending}
        destructive
      />
    </div>
  );
}
