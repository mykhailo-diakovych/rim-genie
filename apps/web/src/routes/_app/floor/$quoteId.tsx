import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { QuoteGeneratorSheet } from "@/components/floor/quote-generator-sheet";
import type { QuoteGeneratorSheetData } from "@/components/floor/quote-generator-sheet";

export const Route = createFileRoute("/_app/floor/$quoteId")({
  component: QuoteEditorPage,
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-page ${className}`} />;
}

// ─── Quote Editor Page ────────────────────────────────────────────────────────

function QuoteEditorPage() {
  const { quoteId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [commentsSynced, setCommentsSynced] = useState(false);

  const quoteQuery = useQuery(orpc.floor.quotes.get.queryOptions({ input: { id: quoteId } }));
  const quote = quoteQuery.data;

  // Sync comments from server on first load
  if (quote && !commentsSynced) {
    setComments(quote.comments ?? "");
    setCommentsSynced(true);
  }

  const invalidateQuote = () =>
    queryClient.invalidateQueries({
      queryKey: orpc.floor.quotes.get.key({ input: { id: quoteId } }),
    });

  const addItem = useMutation({
    ...orpc.floor.quotes.addItem.mutationOptions(),
    onSuccess: async () => {
      await invalidateQuote();
    },
    onError: (err) => toast.error(`Failed to add item: ${err.message}`),
  });

  const removeItem = useMutation({
    ...orpc.floor.quotes.removeItem.mutationOptions(),
    onSuccess: async () => {
      await invalidateQuote();
    },
    onError: (err) => toast.error(`Failed to remove item: ${err.message}`),
  });

  const updateItem = useMutation({
    ...orpc.floor.quotes.updateItem.mutationOptions(),
    onSuccess: async () => {
      await invalidateQuote();
    },
    onError: (err) => toast.error(`Failed to update item: ${err.message}`),
  });

  const updateQuote = useMutation({
    ...orpc.floor.quotes.update.mutationOptions(),
    onSuccess: async () => {
      await invalidateQuote();
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  function handleAdd(data: QuoteGeneratorSheetData) {
    addItem.mutate({
      quoteId,
      vehicleSize: data.vehicleSize ?? undefined,
      sideOfVehicle: data.sideOfVehicle ?? undefined,
      damageLevel: data.damageLevel ?? undefined,
      quantity: data.quantity,
      unitCost: data.unitCost,
      jobTypes: data.jobTypes,
      description: data.description || undefined,
    });
  }

  function handleSave() {
    updateQuote.mutate(
      { id: quoteId, comments },
      {
        onSuccess: () => toast.success("Quote saved"),
      },
    );
  }

  function handleToTechnician() {
    updateQuote.mutate(
      { id: quoteId, status: "pending", comments },
      {
        onSuccess: () => toast.success("Sent to technician"),
      },
    );
  }

  const total = (quote?.total ?? 0) / 100;

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <button
            type="button"
            onClick={() => void navigate({ to: "/floor" })}
            className="flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-[8px] border border-blue font-rubik text-[12px] leading-[14px] text-blue transition-colors hover:bg-blue/5"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={updateQuote.isPending}
              className="flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[8px] bg-green font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-green/90 disabled:opacity-60"
            >
              <Save className="size-4" />
              Save
            </button>
            <button
              type="button"
              onClick={handleToTechnician}
              disabled={updateQuote.isPending}
              className="flex h-9 w-[128px] items-center justify-center gap-1.5 rounded-[8px] bg-blue font-rubik text-[12px] leading-[14px] text-white transition-colors hover:bg-blue/90 disabled:opacity-60"
            >
              <Wrench className="size-4" />
              To Technician
            </button>
            <MoreDropdown quoteId={quoteId} />
          </div>
        </div>

        {/* Invoice card */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
          {/* Row 1: Logo + Title */}
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="Rim Genie" className="h-12 w-auto" />
            <h2 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
              {quoteQuery.isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : quote ? (
                `Quote #${quote.quoteNumber}`
              ) : (
                "Quote"
              )}
            </h2>
          </div>

          <div className="h-px bg-field-line" />

          {/* Row 2: Dates + Address */}
          <div className="flex items-center gap-4">
            <div className="flex flex-1 gap-4 font-rubik">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] leading-[14px] text-label">Quote Date:</span>
                <span className="text-[14px] leading-[18px] text-body">
                  {quoteQuery.isLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    formatDate(quote?.createdAt)
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] leading-[14px] text-label">Valid Until:</span>
                <span className="text-[14px] leading-[18px] text-body">
                  {quoteQuery.isLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    formatDate(quote?.validUntil)
                  )}
                </span>
              </div>
            </div>

            <div className="w-px self-stretch bg-field-line" />

            <div className="flex flex-1 justify-end">
              <div className="flex flex-col gap-1 font-rubik text-[14px] leading-[18px] text-body">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-4 shrink-0 text-ghost" />
                  <span>82c Waltham Park Rd,</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-ghost" />
                  <span>Kingston, Jamaica</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="size-4 shrink-0 text-ghost" />
                  <span>876-830-9624</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-field-line" />

          {/* Jobs table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full font-rubik text-[12px]">
              <thead>
                <tr className="border-t border-b border-field-line text-left text-label">
                  <th className="w-12 border-l border-field-line px-2 py-1.5 font-normal">#</th>
                  <th className="border-l border-field-line px-2 py-1.5 font-normal">
                    Description
                  </th>
                  <th className="w-16 border-l border-field-line px-2 py-1.5 font-normal">
                    Quantity
                  </th>
                  <th className="w-24 border-l border-field-line px-2 py-1.5 font-normal">
                    Unit Cost
                  </th>
                  <th className="w-20 border-l border-field-line px-2 py-1.5 font-normal">Total</th>
                  <th className="w-20 border-r border-l border-field-line px-2 py-1.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {quoteQuery.isLoading ? (
                  <tr className="border-b border-field-line">
                    <td colSpan={6} className="border-r border-l border-field-line px-2 py-6">
                      <div className="flex items-center justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
                      </div>
                    </td>
                  </tr>
                ) : (
                  (quote?.items ?? []).map((item, idx) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={idx}
                      onRemove={() => removeItem.mutate({ id: item.id })}
                      onUnitCostChange={(cents) =>
                        updateItem.mutate({ id: item.id, unitCost: cents })
                      }
                      isRemoving={removeItem.isPending && removeItem.variables?.id === item.id}
                    />
                  ))
                )}

                {/* Add Job row */}
                <tr className="border-b border-field-line">
                  <td colSpan={6} className="border-r border-l border-field-line px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setSheetOpen(true)}
                      className="flex items-center gap-1.5 rounded-[8px] font-rubik text-[14px] leading-[18px] text-blue transition-opacity hover:opacity-70"
                    >
                      <Plus className="size-4" />
                      Add Job
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1">
            <label className="font-rubik text-[12px] leading-[14px] text-label">Comments:</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter note"
              rows={3}
              className="w-full resize-none rounded-[8px] border border-field-line bg-white p-2 font-rubik text-[12px] leading-[14px] text-body transition-colors outline-none placeholder:text-ghost"
            />
          </div>

          <div className="h-px bg-field-line" />

          {/* Footer: Share Quote + Totals */}
          <div className="flex items-end justify-between gap-4">
            {/* Share Quote */}
            <div className="flex flex-col gap-1">
              <span className="font-rubik text-[12px] leading-[14px] text-label">Share Quote:</span>
              <div className="flex flex-col gap-1 font-rubik text-[14px] leading-[18px] text-body">
                {quote?.customer?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-4 shrink-0 text-ghost" />
                    <span>{quote.customer.email}</span>
                  </div>
                )}
                {quote?.customer?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-4 shrink-0 text-ghost" />
                    <span>{quote.customer.phone}</span>
                  </div>
                )}
                {!quote?.customer && !quoteQuery.isLoading && <span className="text-ghost">—</span>}
              </div>
            </div>

            {/* Total */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-end gap-3 px-3 font-rubik text-[16px] leading-[20px]">
                <span className="text-label">Subtotal:</span>
                <span className="text-body">${total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-end gap-3 rounded-sm bg-green px-3 py-2 font-rubik text-[22px] leading-[26px] text-white">
                <span>Total:</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuoteGeneratorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={handleAdd}
        isAdding={addItem.isPending}
      />
    </>
  );
}

// ─── More Dropdown ────────────────────────────────────────────────────────────

function MoreDropdown({ quoteId }: { quoteId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-[72px] items-center justify-center gap-2 rounded-[8px] border border-field-line bg-white font-rubik text-[12px] leading-[14px] text-body transition-colors hover:bg-page"
      >
        More
        <ChevronDown className="size-4 text-ghost" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-36 rounded-[8px] border border-card-line bg-white py-1 shadow-md">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
            }}
            className="flex w-full items-center gap-2 px-3 py-2 font-rubik text-[12px] text-body transition-colors hover:bg-page"
          >
            <Printer className="size-4 text-ghost" />
            Print PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  index,
  onRemove,
  onUnitCostChange,
  isRemoving,
}: {
  item: {
    id: string;
    description: string | null;
    quantity: number;
    unitCost: number;
  };
  index: number;
  onRemove: () => void;
  onUnitCostChange: (cents: number) => void;
  isRemoving: boolean;
}) {
  const [costStr, setCostStr] = useState((item.unitCost / 100).toFixed(2));

  function handleBlur() {
    const val = parseFloat(costStr);
    if (!isNaN(val) && val >= 0) {
      const cents = Math.round(val * 100);
      onUnitCostChange(cents);
    } else {
      setCostStr((item.unitCost / 100).toFixed(2));
    }
  }

  const rowTotal = (item.quantity * item.unitCost) / 100;

  return (
    <tr className="border-b border-field-line align-top">
      <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">{index + 1}</td>
      <td className="border-l border-field-line px-2 py-2">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-[18px] text-body">
            {item.description ?? "Rim Job"}
          </span>
        </div>
      </td>
      <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">
        {item.quantity}
      </td>
      <td className="border-l border-field-line px-2 py-2">
        <div className="flex items-center gap-0.5">
          <span className="text-[14px] text-ghost">$</span>
          <input
            type="text"
            value={costStr}
            onChange={(e) => setCostStr(e.target.value)}
            onBlur={handleBlur}
            className="w-16 rounded-[4px] border border-transparent bg-transparent px-1 py-0.5 font-rubik text-[14px] text-body outline-none hover:border-field-line focus:border-field-line"
          />
        </div>
      </td>
      <td className="border-l border-field-line px-2 py-2 text-[14px] text-body">
        ${rowTotal.toFixed(2)}
      </td>
      <td className="border-r border-l border-field-line px-2 py-2">
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          className="flex h-8 w-[72px] items-center justify-center gap-1.5 rounded-[8px] border border-[#db3e21] font-rubik text-[12px] leading-[14px] text-[#db3e21] transition-colors hover:bg-[#db3e21]/5 disabled:opacity-60"
        >
          <Trash2 className="size-3.5" />
          Remove
        </button>
      </td>
    </tr>
  );
}
