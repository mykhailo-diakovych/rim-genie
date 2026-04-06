import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Info, Plus, Search, Star, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";
import { AddNewClientDialog } from "./add-new-client-dialog";

interface NewQuoteSheetProps {
  open: boolean;
  onClose: () => void;
}

export function NewQuoteSheet({ open, onClose }: NewQuoteSheetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerReason, setCustomerReason] = useState("");
  const [fullDiagnosticConsent, setFullDiagnosticConsent] = useState(false);

  const searchQuery = useQuery({
    ...orpc.floor.customers.search.queryOptions({ input: { query } }),
    enabled: query.length >= 2 && !selectedCustomerId,
  });

  const createQuote = useMutation({
    ...orpc.floor.quotes.create.mutationOptions(),
    onSuccess: async (q) => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } });
      handleClose();
    },
    onError: (err) => {
      toast.error(`Failed to create quote: ${err.message}`);
    },
  });

  const createCustomer = useMutation({
    ...orpc.floor.customers.create.mutationOptions(),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.key() });
      setSelectedCustomerId(customer.id);
      setQuery(customer.name);
      setShowAddClient(false);
      setShowDropdown(false);
    },
    onError: (err) => {
      toast.error(`Failed to create customer: ${err.message}`);
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleClose() {
    setQuery("");
    setShowDropdown(false);
    setShowAddClient(false);
    setSelectedCustomerId(null);
    setCustomerReason("");
    setFullDiagnosticConsent(false);
    onClose();
  }

  function handleSelectCustomer(id: string, name: string) {
    setSelectedCustomerId(id);
    setQuery(name);
    setShowDropdown(false);
  }

  function handleSubmit() {
    if (!selectedCustomerId) return;
    createQuote.mutate({
      customerId: selectedCustomerId,
      customerReason: customerReason.trim() || undefined,
      fullDiagnosticConsent,
    });
  }

  const customers = searchQuery.data ?? [];
  const hasSearched = query.length >= 2 && !selectedCustomerId;
  const noResults = hasSearched && !searchQuery.isLoading && customers.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/75 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col bg-[#fafbfc] shadow-[-4px_0px_24px_0px_rgba(42,44,45,0.08)] transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className={`absolute top-3.5 -left-9 flex items-center justify-center rounded-tl-lg rounded-bl-lg bg-blue p-2 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-label="Close"
        >
          <X className="size-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-0.5 border-b border-field-line p-3">
          <p className="font-rubik text-base leading-5 font-medium text-body">New Quote</p>
          <p className="font-rubik text-xs leading-4 text-label">
            Fill in the customer information to create
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pt-4 pb-10">
          {/* Client Lookup row */}
          <div className="flex flex-col gap-2">
            {/* Select input */}
            <div className="relative flex flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">Customer Lookup:</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);
                    if (selectedCustomerId) {
                      setSelectedCustomerId(null);
                    }
                    setShowDropdown(val.length >= 2);
                  }}
                  onFocus={() => {
                    if (query.length >= 2 && !selectedCustomerId) setShowDropdown(true);
                  }}
                  className="flex h-9 w-full rounded-lg border border-field-line bg-white px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost"
                />
                <Search className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-ghost" />
              </div>

              {/* Dropdown */}
              {showDropdown && hasSearched && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 z-10 mt-1 flex max-h-48 w-full flex-col overflow-y-auto rounded-lg border border-field-line bg-white shadow-card"
                >
                  {searchQuery.isLoading && (
                    <div className="flex items-center justify-center py-3">
                      <div className="size-4 animate-spin rounded-full border-2 border-blue border-t-transparent" />
                    </div>
                  )}
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c.id, c.name)}
                      className="flex items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-page"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-1">
                          <span className="truncate font-rubik text-xs font-medium text-body">
                            {c.name}
                          </span>
                          {c.isVip && (
                            <Star className="size-3 shrink-0 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        <span className="font-rubik text-xs text-label">{c.phone}</span>
                      </div>
                    </button>
                  ))}
                  {noResults && (
                    <div className="px-2 py-3 text-center font-rubik text-xs text-label">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* "Didn't find the customer?" row */}
            <div className="flex items-center gap-2">
              <span className="font-rubik text-xs leading-3.5 text-black">
                Didn't find the customer?
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddClient(true);
                  setShowDropdown(false);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg"
              >
                <Plus className="size-4 text-blue" />
                <span className="font-rubik text-xs leading-3.5 text-blue">Add New Customer</span>
              </button>
            </div>
          </div>

          {/* Customer's reason for today's visit */}
          <div className="flex flex-col gap-1">
            <label className="font-rubik text-xs leading-3.5 text-label">
              Customer's reason for today's visit
            </label>
            <textarea
              value={customerReason}
              onChange={(e) => setCustomerReason(e.target.value)}
              className="h-[70px] w-full resize-none rounded-lg border border-field-line bg-white p-2 font-rubik text-sm leading-[18px] text-body outline-none placeholder:text-[#a0a3a0]"
            />
          </div>

          {/* Full Diagnostic Consent */}
          <div className="flex flex-col gap-2">
            <label className="font-rubik text-xs leading-3.5 text-label">
              Full Diagnostic Service:
            </label>
            <RadioGroup
              value={fullDiagnosticConsent ? "agree" : "disagree"}
              onValueChange={(val) => setFullDiagnosticConsent(val === "agree")}
              className="flex items-center gap-6 py-2"
            >
              <label className="flex cursor-pointer items-center gap-1.5">
                <Radio.Root
                  value="agree"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#cdcfd1] bg-white transition-colors data-checked:border-blue"
                >
                  <Radio.Indicator className="size-2.5 rounded-full bg-blue" />
                </Radio.Root>
                <span className="font-rubik text-sm leading-[18px] text-body">Agree</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <Radio.Root
                  value="disagree"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#cdcfd1] bg-white transition-colors data-checked:border-blue"
                >
                  <Radio.Indicator className="size-2.5 rounded-full bg-blue" />
                </Radio.Root>
                <span className="font-rubik text-sm leading-[18px] text-body">Disagree</span>
              </label>
            </RadioGroup>

            {/* Info banner */}
            <div className="flex items-center gap-3 rounded-lg bg-[#ebf5ff] px-3 py-2">
              <div className="flex shrink-0 items-center justify-center rounded-full bg-[#cbe5fc] p-2">
                <Info className="size-5 text-blue" />
              </div>
              <p className="font-rubik text-xs leading-3.5 text-body">
                Confirm with customer if they would like to proceed with a{" "}
                <span className="font-medium">full diagnostic assessment</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-field-line bg-white p-3">
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" onClick={handleClose} className="w-18">
              Cancel
            </Button>
            <Button
              color="success"
              className="w-32"
              disabled={!selectedCustomerId || createQuote.isPending}
              onClick={handleSubmit}
            >
              {!createQuote.isPending && <Plus />}
              {createQuote.isPending ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </div>
      </div>

      {/* Add New Customer Dialog */}
      <AddNewClientDialog
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onSubmit={(data) => createCustomer.mutate(data)}
        isLoading={createCustomer.isPending}
      />
    </>
  );
}
