import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Plus, Printer, Send, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  completed: { label: "Invoiced", className: "bg-green-100 text-green-700" },
};

function QuoteStatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-rubik text-[11px] leading-[14px] font-medium",
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}

function QuoteCard({
  quote,
  quoteId,
  onDelete,
  isDeleting,
  onSendToCashier,
  isSending,
}: {
  quote: QuoteListItem;
  quoteId: string;
  onDelete: () => void;
  isDeleting: boolean;
  onSendToCashier: () => void;
  isSending: boolean;
}) {
  const isDraft = quote.status === "draft";

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)] sm:min-h-16 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
            {quote.customer.name}
          </span>
          <QuoteStatusBadge status={quote.status} />
        </div>
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
        {isDraft && (
          <Button variant="outline" onClick={onSendToCashier} disabled={isSending}>
            <Send />
            Send to Cashier
          </Button>
        )}
        <Button nativeButton={false} render={<Link to="/floor/$quoteId" params={{ quoteId }} />}>
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
        <Button
          variant="outline"
          color="destructive"
          onClick={onDelete}
          disabled={isDeleting || !isDraft}
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

  const sendToCashier = useMutation({
    ...orpc.floor.quotes.sendToCashier.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      toast.success("Invoice created and sent to cashier");
    },
    onError: (err) => toast.error(`Failed to send: ${err.message}`),
  });

  const quotes = quotesQuery.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
          List of Quotes
        </h1>
        <Button nativeButton={false} render={<Link to="/floor/new-quote" />}>
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
              quoteId={quote.id}
              onDelete={() => deleteQuote.mutate({ id: quote.id })}
              isDeleting={deleteQuote.isPending && deleteQuote.variables?.id === quote.id}
              onSendToCashier={() => sendToCashier.mutate({ id: quote.id })}
              isSending={sendToCashier.isPending && sendToCashier.variables?.id === quote.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
