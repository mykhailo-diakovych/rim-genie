import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Phone, Plus, Search, Star, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/floor/new-quote")({
  component: NewQuotePage,
});

// ─── Create Customer Form ─────────────────────────────────────────────────────

function CreateCustomerForm({
  defaultPhone,
  onCancel,
  onCreated,
}: {
  defaultPhone: string;
  onCancel: () => void;
  onCreated: (customerId: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState("");

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createCustomer = useMutation({
    ...orpc.floor.customers.create.mutationOptions(),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.key() });
      onCreated(customer.id);
    },
    onError: (err) => {
      toast.error(`Failed to create customer: ${err.message}`);
    },
  });

  const createQuote = useMutation({
    ...orpc.floor.quotes.create.mutationOptions(),
    onSuccess: async (q) => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } });
    },
    onError: (err) => {
      toast.error(`Failed to create quote: ${err.message}`);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullPhone = phone.startsWith("+") ? phone : `+1 876 ${phone}`;
    const customer = await createCustomer.mutateAsync({
      name,
      phone: fullPhone,
      email: email || undefined,
    });
    await createQuote.mutateAsync({ customerId: customer.id });
  }

  const isLoading = createCustomer.isPending || createQuote.isPending;

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-card-line bg-white p-4 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-blue/10">
          <User className="size-4 text-blue" />
        </div>
        <p className="font-rubik text-[14px] font-medium text-body">New Customer</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-rubik text-[12px] text-label">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="flex h-9 w-full rounded-[8px] border border-field-line bg-white px-3 font-rubik text-[13px] text-body outline-none placeholder:text-ghost"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-rubik text-[12px] text-label">Phone *</label>
          <div className="flex h-9 w-full items-center overflow-hidden rounded-[8px] border border-field-line bg-white">
            <div className="flex h-full shrink-0 items-center border-r border-field-line px-2">
              <span className="font-rubik text-[12px] leading-[14px] text-body">+1 876</span>
            </div>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="000-0000"
              className="min-w-0 flex-1 bg-transparent px-2 font-rubik text-[13px] text-body outline-none placeholder:text-ghost"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-rubik text-[12px] text-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
            className="flex h-9 w-full rounded-[8px] border border-field-line bg-white px-3 font-rubik text-[13px] text-body outline-none placeholder:text-ghost"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" color="success" disabled={isLoading} className="flex-1">
            <Plus />
            {isLoading ? "Creating..." : "Create & Quote"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Customer Card ────────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  onSelect,
  isLoading,
}: {
  customer: { id: string; name: string; phone: string; email: string | null; isVip: boolean };
  onSelect: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-1 gap-5">
        <div className="flex items-center gap-1.5">
          <span className="font-rubik text-[14px] font-medium text-body">{customer.name}</span>
          {customer.isVip && <Star className="size-3.5 fill-yellow-400 text-yellow-400" />}
        </div>
        <div className="flex flex-wrap items-center gap-2 font-rubik text-[12px] text-label">
          <Phone className="size-3.5" />
          <span className="text-body">{customer.phone}</span>
          {customer.email && (
            <>
              <span className="size-1 rounded-full bg-ghost" />
              <span className="text-body">{customer.email}</span>
            </>
          )}
        </div>
      </div>
      <Button onClick={onSelect} disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create Quote"}
      </Button>
    </div>
  );
}

// ─── New Quote Page ───────────────────────────────────────────────────────────

function NewQuotePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectingCustomerId, setSelectingCustomerId] = useState<string | null>(null);

  const searchQuery = useQuery({
    ...orpc.floor.customers.search.queryOptions({ input: { query } }),
    enabled: query.length >= 2,
  });

  const createQuote = useMutation({
    ...orpc.floor.quotes.create.mutationOptions(),
    onSuccess: async (q) => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      void navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } });
    },
    onError: (err) => {
      toast.error(`Failed to create quote: ${err.message}`);
      setSelectingCustomerId(null);
    },
  });

  function handleSelectCustomer(customerId: string) {
    setSelectingCustomerId(customerId);
    createQuote.mutate({ customerId });
  }

  const customers = searchQuery.data ?? [];
  const hasSearched = query.length >= 2;
  const noResults = hasSearched && !searchQuery.isLoading && customers.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" nativeButton={false} render={<Link to="/floor" />}>
          <ArrowLeft />
          Back to list
        </Button>
        <h1 className="font-rubik text-[18px] font-medium text-body">New Quote</h1>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ghost" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowCreateForm(false);
            }}
            placeholder="Search by name or phone number..."
            className="flex h-10 w-full rounded-[8px] border border-field-line bg-white pr-3 pl-9 font-rubik text-[13px] text-body outline-none placeholder:text-ghost"
            autoFocus
          />
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="flex flex-col gap-2">
            {searchQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
              </div>
            )}

            {customers.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onSelect={() => handleSelectCustomer(c.id)}
                isLoading={selectingCustomerId === c.id && createQuote.isPending}
              />
            ))}

            {noResults && !showCreateForm && (
              <div className="flex flex-col items-center gap-3 rounded-[12px] border border-card-line bg-white p-6 text-center">
                <p className="font-rubik text-[14px] text-label">
                  No customers found for "{query}"
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus />
                  Create New Customer
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <CreateCustomerForm
            defaultPhone={query}
            onCancel={() => setShowCreateForm(false)}
            onCreated={() => {
              /* navigation handled inside form */
            }}
          />
        )}

        {!hasSearched && (
          <p className="text-center font-rubik text-[13px] text-ghost">
            Type at least 2 characters to search
          </p>
        )}
      </div>
    </div>
  );
}
