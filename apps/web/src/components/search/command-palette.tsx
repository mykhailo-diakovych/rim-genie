import { useState } from "react";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { FileText, Receipt, Search, User, Users } from "lucide-react";

import { useDebounce } from "@/lib/use-debounce";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    ...orpc.search.global.queryOptions({ input: { query: debouncedQuery } }),
    enabled: debouncedQuery.length >= 1,
  });

  const hasResults =
    data &&
    (data.customers.length > 0 ||
      data.quotes.length > 0 ||
      data.invoices.length > 0 ||
      data.employees.length > 0);

  function select(cb: () => void) {
    onOpenChange(false);
    setQuery("");
    cb();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 outline-none">
          <Command
            shouldFilter={false}
            className="overflow-hidden rounded-xl bg-dialog shadow-dialog"
          >
            <div className="flex items-center gap-3 border-b border-field-line px-3">
              <Search className="size-4 shrink-0 text-ghost" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={m.search_placeholder()}
                className="h-11 flex-1 bg-transparent font-rubik text-sm text-body outline-none placeholder:text-ghost"
              />
              {isFetching && (
                <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-ghost border-t-transparent" />
              )}
            </div>

            <Command.List className="max-h-72 overflow-y-auto p-2">
              {debouncedQuery.length === 0 && (
                <div className="py-6 text-center font-rubik text-sm text-ghost">
                  {m.search_empty()}
                </div>
              )}

              {debouncedQuery.length >= 1 && !isFetching && !hasResults && (
                <Command.Empty className="py-6 text-center font-rubik text-sm text-ghost">
                  {m.search_no_results()}
                </Command.Empty>
              )}

              {data && data.customers.length > 0 && (
                <Command.Group
                  heading={m.search_group_customers()}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-rubik [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ghost"
                >
                  {data.customers.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`customer-${c.id}`}
                      onSelect={() =>
                        select(() =>
                          navigate({ to: "/customers/$customerId", params: { customerId: c.id } }),
                        )
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 font-rubik text-sm text-body data-[selected]:bg-page"
                    >
                      <User className="size-4 shrink-0 text-label" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{c.name}</p>
                        <p className="truncate text-xs text-label">{c.phone}</p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {data && data.quotes.length > 0 && (
                <Command.Group
                  heading={m.search_group_quotes()}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-rubik [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ghost"
                >
                  {data.quotes.map((q) => (
                    <Command.Item
                      key={q.id}
                      value={`quote-${q.id}`}
                      onSelect={() =>
                        select(() => navigate({ to: "/floor/$quoteId", params: { quoteId: q.id } }))
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 font-rubik text-sm text-body data-[selected]:bg-page"
                    >
                      <FileText className="size-4 shrink-0 text-label" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {m.search_quote_number({ number: String(q.quoteNumber) })}
                        </p>
                        <p className="truncate text-xs text-label">{q.customerName}</p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {data && data.invoices.length > 0 && (
                <Command.Group
                  heading={m.search_group_invoices()}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-rubik [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ghost"
                >
                  {data.invoices.map((inv) => (
                    <Command.Item
                      key={inv.id}
                      value={`invoice-${inv.id}`}
                      onSelect={() =>
                        select(() =>
                          navigate({
                            to: "/cashier/$invoiceId",
                            params: { invoiceId: inv.id },
                          }),
                        )
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 font-rubik text-sm text-body data-[selected]:bg-page"
                    >
                      <Receipt className="size-4 shrink-0 text-label" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {m.search_invoice_number({ number: String(inv.invoiceNumber) })}
                        </p>
                        <p className="truncate text-xs text-label">{inv.customerName}</p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {data && data.employees.length > 0 && (
                <Command.Group
                  heading={m.search_group_employees()}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-rubik [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ghost"
                >
                  {data.employees.map((emp) => (
                    <Command.Item
                      key={emp.id}
                      value={`employee-${emp.id}`}
                      onSelect={() => select(() => navigate({ to: "/employees" }))}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 font-rubik text-sm text-body data-[selected]:bg-page"
                    >
                      <Users className="size-4 shrink-0 text-label" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{emp.name}</p>
                        <p className="truncate text-xs text-label">{emp.email}</p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
