import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/floor/")({
  component: FloorPage,
});

// ─── Quote Card ───────────────────────────────────────────────────────────────

type QuoteListItem = {
  id: string;
  quoteNumber: number;
  total: number;
  jobRack: string | null;
  customer: { name: string };
};

function QuoteCard({
  quote,
  onView,
  onDelete,
  isDeleting,
}: {
  quote: QuoteListItem;
  onView: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)] sm:min-h-16 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
          {quote.customer.name}
        </span>
        <div className="flex flex-wrap items-center gap-2 font-rubik text-[12px] leading-[14px]">
          <span className="text-label">Quote ID:</span>
          <span className="text-body">{quote.quoteNumber}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Total:</span>
          <span className="text-body">${(quote.total / 100).toFixed(2)}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Job Rack:</span>
          <span className="text-body">{quote.jobRack ?? "—"}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] bg-blue font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-blue/90"
        >
          <Eye className="size-4" />
          View
        </button>
        <button
          type="button"
          onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
          className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-blue font-rubik text-[12px] leading-[14px] text-blue transition-colors hover:bg-blue/5"
        >
          <Printer className="size-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5 disabled:opacity-60"
        >
          <Trash2 className="size-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Floor Page ───────────────────────────────────────────────────────────────

function FloorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const quotesQuery = useQuery(orpc.floor.quotes.list.queryOptions());

  const deleteQuote = useMutation({
    ...orpc.floor.quotes.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
    },
    onError: (err) => toast.error(`Failed to delete quote: ${err.message}`),
  });

  const quotes = quotesQuery.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
          List of Quotes
        </h1>
        <button
          type="button"
          onClick={() => void navigate({ to: "/floor/new-quote" })}
          className="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] bg-blue font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-blue/90"
        >
          <Plus className="size-4" />
          New Quote
        </button>
      </div>

      {/* Quote list */}
      <div className="flex flex-col gap-2">
        {quotesQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[12px] border border-card-line bg-white"
            />
          ))
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[12px] border border-card-line bg-white p-8 text-center">
            <p className="font-rubik text-[14px] text-label">No quotes yet</p>
            <p className="font-rubik text-[12px] text-ghost">
              Click "New Quote" to create your first quote
            </p>
          </div>
        ) : (
          quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onView={() => void navigate({ to: "/floor/$quoteId", params: { quoteId: quote.id } })}
              onDelete={() => deleteQuote.mutate({ id: quote.id })}
              isDeleting={deleteQuote.isPending && deleteQuote.variables?.id === quote.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
