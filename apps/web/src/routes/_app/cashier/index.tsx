import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronDown, CircleDollarSign, Eye, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const TAB_VALUES = ["unpaid", "partially", "paid"] as const;
type InvoiceTab = (typeof TAB_VALUES)[number];

const TAB_LABELS: Record<InvoiceTab, string> = {
  unpaid: "Unpaid",
  partially: "Partially",
  paid: "Paid",
};

const DATE_RANGES = ["7d", "30d", "90d", "all"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

function getDateFrom(range: DateRange): string | undefined {
  if (range === "all") return undefined;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setMilliseconds(0);
  return d.toISOString();
}

export const Route = createFileRoute("/_app/cashier/")({
  validateSearch: (search: Record<string, unknown>): { tab: InvoiceTab; dateRange: DateRange } => ({
    tab: TAB_VALUES.includes(search.tab as InvoiceTab) ? (search.tab as InvoiceTab) : "unpaid",
    dateRange: DATE_RANGES.includes(search.dateRange as DateRange)
      ? (search.dateRange as DateRange)
      : "30d",
  }),
  component: CashierPage,
});

function TabCounter({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-7 items-center justify-center rounded-full px-1 font-rubik text-xs leading-[14px]",
        active ? "bg-blue text-white" : "bg-[#e2e4e5] text-label",
      )}
    >
      {count}
    </span>
  );
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function InvoiceCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-xl border border-card-line bg-white p-3 sm:min-h-16 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-4 w-32 rounded bg-[#e2e4e5]" />
        <div className="h-4 w-16 rounded bg-[#e2e4e5]" />
        <div className="h-4 w-24 rounded bg-[#e2e4e5]" />
        <div className="h-4 w-28 rounded bg-[#e2e4e5]" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="h-9 w-20 rounded-lg bg-[#e2e4e5]" />
        <div className="h-9 w-16 rounded-lg bg-[#e2e4e5]" />
        <div className="h-9 w-20 rounded-lg bg-[#e2e4e5]" />
      </div>
    </div>
  );
}

function InvoiceCard({
  invoice,
  onDelete,
  isDeleting,
  onPay,
}: {
  invoice: {
    id: string;
    invoiceNumber: number;
    status: string;
    total: number;
    balance: number;
    createdAt: Date | string;
    customerName: string;
  };
  onDelete: () => void;
  isDeleting: boolean;
  onPay: () => void;
}) {
  const canPay = invoice.status !== "paid";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)] sm:min-h-16 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-rubik text-sm leading-[18px] font-medium text-body">
            {invoice.customerName}
          </span>
        </div>

        <div className="flex shrink-0 flex-col gap-1 font-rubik text-[11px] leading-[14px]">
          <span className="text-label">ID:</span>
          <span className="text-body">{invoice.invoiceNumber}</span>
        </div>

        <div className="flex shrink-0 flex-col gap-1 font-rubik text-[11px] leading-[14px]">
          <span className="text-label">Date :</span>
          <span className="truncate text-body">{formatDate(invoice.createdAt)}</span>
        </div>

        <div className="flex shrink-0 flex-col gap-1 font-rubik text-[11px] leading-[14px]">
          <span className="text-label">Total / Balance</span>
          <span className="text-body">
            {formatCents(invoice.total)} / {formatCents(invoice.balance)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          nativeButton={false}
          render={<Link to="/cashier/$invoiceId" params={{ invoiceId: invoice.id }} />}
        >
          <Eye />
          View
        </Button>
        <Button variant="outline" color="success" disabled={!canPay} onClick={onPay}>
          <CircleDollarSign />
          Pay
        </Button>
        <Button variant="outline" color="destructive" onClick={onDelete} disabled={isDeleting}>
          <Trash2 />
          Delete
        </Button>
      </div>
    </div>
  );
}

function DateRangeDropdown({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center justify-between gap-1.5 rounded-md border border-field-line bg-white px-2 py-2.5 font-rubik text-xs text-body"
      >
        <Calendar className="size-4 text-label" />
        {DATE_RANGE_LABELS[value]}
        <ChevronDown className="size-4 text-label" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-50 mt-1 w-40 rounded-md border border-card-line bg-white py-1 shadow-md">
            {DATE_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => {
                  onChange(range);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 font-rubik text-xs text-body transition-colors hover:bg-blue/5",
                  value === range && "text-blue",
                )}
              >
                {DATE_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CashierPage() {
  const { tab, dateRange } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const dateFrom = getDateFrom(dateRange);

  const unpaidQuery = useQuery(
    orpc.cashier.invoices.list.queryOptions({
      input: { status: "unpaid", dateFrom },
    }),
  );
  const partiallyQuery = useQuery(
    orpc.cashier.invoices.list.queryOptions({
      input: { status: "partially_paid", dateFrom },
    }),
  );
  const paidQuery = useQuery(
    orpc.cashier.invoices.list.queryOptions({
      input: { status: "paid", dateFrom },
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

  const deleteInvoice = useMutation({
    ...orpc.cashier.invoices.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.cashier.invoices.list.key() });
      toast.success("Invoice deleted");
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
          List of Invoices
        </h1>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          navigate({ search: (prev) => ({ ...prev, tab: value as InvoiceTab }) });
        }}
      >
        <TabsList>
          {TAB_VALUES.map((value) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {TAB_LABELS[value]}
              <TabCounter count={counts[value]} active={tab === value} />
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex justify-end pt-3">
          <DateRangeDropdown
            value={dateRange}
            onChange={(range) => navigate({ search: (prev) => ({ ...prev, dateRange: range }) })}
          />
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
                      onDelete={() => deleteInvoice.mutate({ id: invoice.id })}
                      isDeleting={
                        deleteInvoice.isPending && deleteInvoice.variables?.id === invoice.id
                      }
                      onPay={() => navigate({ to: "/cashier/$invoiceId/checkout", params: { invoiceId: invoice.id } })}
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
    </div>
  );
}
