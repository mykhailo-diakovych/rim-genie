import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/floor/")({
  component: FloorPage,
});

// ─── Quote Card ───────────────────────────────────────────────────────────────

type QuoteListItem = {
  id: string;
  quoteNumber: number;
  total: number;
  status: string;
  jobRack: string | null;
  customer: { name: string };
};

function QuoteCard({
  quote,
  quoteId,
  onDelete,
  isDeleting,
}: {
  quote: QuoteListItem;
  quoteId: string;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card sm:min-h-16 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-rubik text-sm leading-4.5 font-medium text-body">
            {quote.customer.name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-rubik text-xs leading-3.5">
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
        <Button
          className="w-18 gap-1.5 px-2"
          nativeButton={false}
          render={<Link to="/floor/$quoteId" params={{ quoteId }} />}
        >
          <Eye />
          View
        </Button>
        <Button
          className="w-18 gap-1.5 px-2"
          variant="outline"
          onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
        >
          <Printer />
          Print
        </Button>
        <Button
          className="w-18 gap-1.5 px-2"
          variant="outline"
          color="destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </div>
  );
}

// ─── Floor Page ───────────────────────────────────────────────────────────────

function FloorPage() {
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
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">List of Quotes</h1>
        <Button className="w-32" nativeButton={false} render={<Link to="/floor/new-quote" />}>
          <Plus />
          New Quote
        </Button>
      </div>

      {/* Quote list */}
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
              quoteId={quote.id}
              onDelete={() => deleteQuote.mutate({ id: quote.id })}
              isDeleting={deleteQuote.isPending && deleteQuote.variables?.id === quote.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
