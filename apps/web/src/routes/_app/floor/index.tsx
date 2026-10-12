import { useState } from "react";
import type * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Plus, Printer, Search, Trash2 } from "lucide-react";
import { NewQuoteSheet } from "@/components/floor/new-quote-sheet";
import { formatCents } from "@/lib/format-currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { RowActionsMenu, RowActionsMenuItem } from "@/components/ui/row-actions-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DateRangeFilter,
  getDateFrom,
  getDateTo,
  parseDateRange,
  type DateRange,
} from "@/components/ui/date-range-filter";
import { usePersistedState } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/floor/")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Floor Queue" }],
  }),
  component: FloorPage,
});

type QuoteListItem = {
  id: string;
  quoteNumber: number;
  total: number;
  status: string;
  jobRack: string | null;
  customer: { name: string };
  createdBy?: { id: string; name: string } | null;
};

function QuoteField({
  label,
  children,
  valueClassName,
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 lg:flex-1 lg:border-l lg:border-card-line lg:pl-5">
      <span className="font-rubik text-xs leading-3.5 text-label">{label}</span>
      <span className={cn("truncate font-rubik text-sm leading-4.5 text-body", valueClassName)}>
        {children}
      </span>
    </div>
  );
}

function QuoteCard({
  quote,
  onDelete,
  isAdmin,
}: {
  quote: QuoteListItem;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card lg:flex-row lg:items-center lg:gap-5 lg:px-5">
      <div className="flex min-w-0 flex-col gap-1 lg:flex-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-rubik text-base leading-5 font-medium text-body">
            {quote.customer.name}
          </span>
          <StatusBadge status={quote.status} className="shrink-0" />
        </div>
        <span className="font-rubik text-sm leading-4.5 text-label">
          {`QUO-${String(quote.quoteNumber).padStart(4, "0")}`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-card-line pt-3 lg:contents">
        <QuoteField label="Job Rack">{quote.jobRack ?? "—"}</QuoteField>
        <QuoteField label="Prepared By">{quote.createdBy?.name ?? "—"}</QuoteField>
        <QuoteField label="Quote Total" valueClassName="text-base leading-5 font-semibold">
          {formatCents(quote.total)}
        </QuoteField>
      </div>

      <div className="flex items-center gap-2 lg:shrink-0 lg:border-l lg:border-card-line lg:pl-5">
        <Button
          nativeButton={false}
          render={<Link to="/floor/$quoteId" params={{ quoteId: quote.id }} />}
        >
          <Eye />
          View
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
        >
          <Printer />
          Print
        </Button>
        {isAdmin && (
          <RowActionsMenu label="Quote actions" className="size-9">
            <RowActionsMenuItem destructive onClick={onDelete}>
              <Trash2 />
              Delete
            </RowActionsMenuItem>
          </RowActionsMenu>
        )}
      </div>
    </div>
  );
}

function FloorPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = usePersistedState<DateRange>("floor.dateRange", "30d", (v) =>
    parseDateRange(v, "30d"),
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showNewQuote, setShowNewQuote] = useState(false);

  const dateFrom = getDateFrom(dateRange);
  const dateTo = getDateTo(dateRange);

  const quotesQuery = useQuery(
    orpc.floor.quotes.list.queryOptions({
      input: { search: search.trim() || undefined, dateFrom, dateTo },
    }),
  );

  const deleteQuote = useMutation({
    ...orpc.floor.quotes.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(`Failed to delete quote: ${err.message}`),
  });

  const quotes = quotesQuery.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5 p-3 sm:p-5">
      <PageHeader
        title="Floor Queue"
        description="Review and manage quotes awaiting processing or finalization."
        actions={
          <>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <Button onClick={() => setShowNewQuote(true)}>
              <Plus />
              New Quote
            </Button>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ghost" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quote # or customer..."
          className="flex h-10 w-full rounded-lg border border-field-line bg-white pr-3 pl-9 font-rubik text-sm text-body outline-none placeholder:text-ghost"
        />
      </div>

      <div className="flex flex-col gap-2">
        {quotesQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-card-line bg-white"
            />
          ))
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-card-line bg-white p-8 text-center">
            <p className="font-rubik text-sm text-label">No quotes yet</p>
            <p className="font-rubik text-xs text-ghost">
              Click "New Quote" to create your first quote
            </p>
          </div>
        ) : (
          quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onDelete={() => setDeleteConfirm(quote.id)}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title="Delete quote"
        description={
          <>
            Are you sure you want to delete this quote?
            <br />
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && deleteQuote.mutate({ id: deleteConfirm })}
        isPending={deleteQuote.isPending}
        destructive
      />

      <NewQuoteSheet open={showNewQuote} onClose={() => setShowNewQuote(false)} />
    </div>
  );
}
