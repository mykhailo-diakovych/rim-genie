import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/floor/")({
  component: FloorPage,
});

// Mock data — replace with real API data when backend is ready
const MOCK_QUOTES = [
  { id: "5201", customer: "Smith Jack", total: "$0.00", jobRack: "—" },
  { id: "5196", customer: "Darlene Robertson", total: "$100.00", jobRack: "20" },
  { id: "5190", customer: "Floyd Miles", total: "$120.00", jobRack: "19" },
];

function QuoteCard({
  quote,
  onView,
  onDelete,
}: {
  quote: (typeof MOCK_QUOTES)[number];
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)] sm:min-h-16 sm:flex-row sm:items-center sm:justify-between">
      {/* Left */}
      <div className="flex flex-col gap-1">
        <span className="font-rubik text-[14px] leading-[18px] font-medium text-body">
          {quote.customer}
        </span>
        <div className="flex flex-wrap items-center gap-2 font-rubik text-[12px] leading-[14px]">
          <span className="text-label">Quote ID:</span>
          <span className="text-body">{quote.id}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Total:</span>
          <span className="text-body">{quote.total}</span>
          <span className="size-1 rounded-full bg-ghost" />
          <span className="text-label">Job Rack:</span>
          <span className="text-body">{quote.jobRack}</span>
        </div>
      </div>

      {/* Right — action buttons */}
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
          className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-blue font-rubik text-[12px] leading-[14px] text-blue transition-colors hover:bg-blue/5"
        >
          <Printer className="size-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5"
        >
          <Trash2 className="size-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

function FloorPage() {
  const navigate = useNavigate();

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
        {MOCK_QUOTES.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onView={() => void navigate({ to: "/floor/new-quote" })}
            onDelete={() => {
              /* TODO: delete handler */
            }}
          />
        ))}
      </div>
    </div>
  );
}
