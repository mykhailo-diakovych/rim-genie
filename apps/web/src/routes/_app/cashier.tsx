import { useMemo } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronDown, CircleDollarSign, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TAB_VALUES = ["unpaid", "partially", "paid"] as const;
type InvoiceTab = (typeof TAB_VALUES)[number];

const TAB_LABELS: Record<InvoiceTab, string> = {
  unpaid: "Unpaid",
  partially: "Partially",
  paid: "Paid",
};

type Invoice = {
  id: number;
  customerName: string;
  date: string;
  total: number;
  balance: number | null;
  status: InvoiceTab;
  tag?: string;
};

const MOCK_INVOICES: Invoice[] = [
  {
    id: 5118,
    customerName: "Smith Jack",
    date: "01.01.26",
    total: 1500,
    balance: 1500,
    status: "unpaid",
  },
  {
    id: 5110,
    customerName: "Darlene Robertson",
    date: "Dec 26, 2025",
    total: 250,
    balance: null,
    status: "unpaid",
  },
  {
    id: 5118,
    customerName: "Ralph Edwards",
    date: "01.01.26",
    total: 1500,
    balance: 1500,
    status: "partially",
  },
  {
    id: 5112,
    customerName: "Wade Warren",
    date: "01.01.26",
    total: 1500,
    balance: 1500,
    status: "partially",
  },
  {
    id: 5118,
    customerName: "Kathryn Murphy",
    date: "01.01.26",
    total: 1500,
    balance: 1500,
    status: "paid",
    tag: "Technician Queue",
  },
  {
    id: 5120,
    customerName: "Floyd Miles",
    date: "01.01.26",
    total: 1500,
    balance: 1500,
    status: "paid",
    tag: "Technician Queue",
  },
  {
    id: 5122,
    customerName: "Darrell Steward",
    date: "01.01.26",
    total: 1500,
    balance: 1500,
    status: "paid",
  },
];

export const Route = createFileRoute("/_app/cashier")({
  validateSearch: (search: Record<string, unknown>): { tab: InvoiceTab } => ({
    tab: TAB_VALUES.includes(search.tab as InvoiceTab) ? (search.tab as InvoiceTab) : "unpaid",
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

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const isUnpaid = invoice.status === "unpaid";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)] sm:min-h-16 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-rubik text-sm leading-[18px] font-medium text-body">
            {invoice.customerName}
          </span>
          {invoice.tag && (
            <span className="w-fit rounded bg-[#32cbfa] px-1.5 py-0.5 font-rubik text-[11px] leading-[14px] text-white">
              {invoice.tag}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1 font-rubik text-[11px] leading-[14px]">
          <span className="text-label">ID:</span>
          <span className="text-body">{invoice.id}</span>
        </div>

        <div className="flex shrink-0 flex-col gap-1 font-rubik text-[11px] leading-[14px]">
          <span className="text-label">Date :</span>
          <span className="truncate text-body">{invoice.date}</span>
        </div>

        <div className="flex shrink-0 flex-col gap-1 font-rubik text-[11px] leading-[14px]">
          <span className="text-label">Total / Balance</span>
          <span className="text-body">
            ${invoice.total.toFixed(2)}
            {invoice.balance != null ? ` / $${invoice.balance.toFixed(2)}` : ""}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button>
          <Eye />
          View
        </Button>
        <Button variant="outline" color="success" disabled={!isUnpaid}>
          <CircleDollarSign />
          Pay
        </Button>
        <Button variant="outline" color="destructive" disabled={isUnpaid}>
          <Trash2 />
          Delete
        </Button>
      </div>
    </div>
  );
}

function CashierPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const counts = useMemo(
    () => ({
      unpaid: MOCK_INVOICES.filter((i) => i.status === "unpaid").length,
      partially: MOCK_INVOICES.filter((i) => i.status === "partially").length,
      paid: MOCK_INVOICES.filter((i) => i.status === "paid").length,
    }),
    [],
  );

  const filteredInvoices = useMemo(() => MOCK_INVOICES.filter((i) => i.status === tab), [tab]);

  return (
    <div className="flex flex-col gap-5 p-5">
      <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
        List of Invoices
      </h1>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          navigate({ search: { tab: value as InvoiceTab } });
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
          <button
            type="button"
            className="flex h-9 items-center justify-between gap-1.5 rounded-md border border-field-line bg-white px-2 py-2.5 font-rubik text-xs text-body"
          >
            <Calendar className="size-4 text-label" />
            Last 30 days
            <ChevronDown className="size-4 text-label" />
          </button>
        </div>

        {TAB_VALUES.map((value) => (
          <TabsContent key={value} value={value}>
            <div className="flex flex-col gap-2 pt-2">
              {filteredInvoices.map((invoice) => (
                <InvoiceCard key={`${invoice.id}-${invoice.customerName}`} invoice={invoice} />
              ))}
              {filteredInvoices.length === 0 && (
                <p className="py-8 text-center font-rubik text-sm text-label">No invoices found</p>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
