import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { InvoiceCard, InvoiceCardSkeleton } from "@/components/cashier/invoice-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DateRangeFilter,
  getDateFrom,
  getDateTo,
  isDatePreset,
  parseDateRange,
  type DatePreset,
  type DateRange,
} from "@/components/ui/date-range-filter";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectOption, SelectPopup, SelectTrigger } from "@/components/ui/select";
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

const TAB_STATUS = {
  unpaid: "unpaid",
  partially: "partially_paid",
  paid: "paid",
} as const satisfies Record<InvoiceTab, string>;

const DATE_FIELDS = ["invoice", "lastPayment"] as const;
type DateField = (typeof DATE_FIELDS)[number];

const DATE_FIELD_LABELS: Record<DateField, string> = {
  invoice: "Invoice Date",
  lastPayment: "Last Payment Date",
};

export const Route = createFileRoute("/_app/cashier/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: InvoiceTab; dateRange?: DatePreset } => ({
    tab: TAB_VALUES.includes(search.tab as InvoiceTab) ? (search.tab as InvoiceTab) : undefined,
    dateRange: isDatePreset(search.dateRange) ? search.dateRange : undefined,
  }),
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
  const [tab, setTabState] = usePersistedState<InvoiceTab>("cashier.tab", "unpaid", (v) =>
    TAB_VALUES.includes(v as InvoiceTab) ? (v as InvoiceTab) : null,
  );
  const [dateRange, setDateRangeState] = usePersistedState<DateRange>(
    "cashier.dateRange",
    "30d",
    (v) => parseDateRange(v, "30d"),
  );
  const [dateField, setDateFieldState] = usePersistedState<DateField>(
    "cashier.dateField",
    "invoice",
    (v) => (DATE_FIELDS.includes(v as DateField) ? (v as DateField) : null),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const queryClient = useQueryClient();

  function setTab(next: InvoiceTab) {
    setTabState(next);
    setPage(1);
  }
  function setDateRange(next: DateRange) {
    setDateRangeState(next);
    setPage(1);
  }
  function setDateField(next: DateField) {
    setDateFieldState(next);
    setPage(1);
  }

  const search = Route.useSearch();
  useEffect(() => {
    if (search.tab) setTab(search.tab);
    if (search.dateRange) setDateRange(search.dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab, search.dateRange]);

  const dateFrom = getDateFrom(dateRange);
  const dateTo = getDateTo(dateRange);

  function listQuery(value: InvoiceTab) {
    const active = value === tab;
    return orpc.cashier.invoices.list.queryOptions({
      input: {
        status: TAB_STATUS[value],
        dateFrom,
        dateTo,
        dateField,
        page: active ? page : 1,
        pageSize: active ? pageSize : 1,
      },
      placeholderData: keepPreviousData,
    });
  }

  const unpaidQuery = useQuery(listQuery("unpaid"));
  const partiallyQuery = useQuery(listQuery("partially"));
  const paidQuery = useQuery(listQuery("paid"));

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
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={dateField} onValueChange={(v) => setDateField(v as DateField)}>
                  <SelectTrigger className="w-44" aria-label="Filter by date">
                    <span className="truncate">{DATE_FIELD_LABELS[dateField]}</span>
                  </SelectTrigger>
                  <SelectPopup>
                    {DATE_FIELDS.map((field) => (
                      <SelectOption key={field} value={field}>
                        {DATE_FIELD_LABELS[field]}
                      </SelectOption>
                    ))}
                  </SelectPopup>
                </Select>
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
              </div>
            }
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
                  {counts[value] > 0 && (
                    <Pagination
                      page={page}
                      pageSize={pageSize}
                      total={counts[value]}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
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
