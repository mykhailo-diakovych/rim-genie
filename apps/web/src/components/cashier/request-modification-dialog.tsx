import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const REASON_LIMIT = 500;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-rubik text-xs leading-3.5 text-label">{label}</span>
      <span className="truncate rounded-md bg-page px-3 py-2 font-rubik text-sm leading-4.5 text-body">
        {value}
      </span>
    </div>
  );
}

export function RequestModificationDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceNumber: number;
    customerName: string;
    total: number;
    paid: number;
  };
}) {
  const queryClient = useQueryClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");

  const adminsQuery = useQuery({
    ...orpc.invoiceModification.admins.queryOptions(),
    enabled: open,
  });
  const term = search.trim().toLowerCase();
  const admins = (adminsQuery.data ?? []).filter(
    (a) => !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term),
  );

  function reset() {
    setAdminId(null);
    setSearch("");
    setReason("");
  }

  const sendRequest = useMutation({
    ...orpc.invoiceModification.request.mutationOptions(),
    onSuccess: async ({ emailError }) => {
      await queryClient.invalidateQueries({ queryKey: orpc.invoiceModification.key() });
      if (emailError) {
        toast.warning(
          `Modification request recorded, but the email could not be sent: ${emailError}`,
        );
      } else {
        toast.success("Modification request sent");
      }
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <div className="flex max-h-[85svh] flex-col gap-4 overflow-y-auto px-4 pt-4 pb-3">
          <div className="flex flex-col gap-1 pr-6">
            <DialogTitle className="text-lg">Request Invoice Modification</DialogTitle>
            <DialogDescription>
              Select an Admin to review and approve this request. Once approved, the invoice will be
              returned to the Floor queue for editing.
            </DialogDescription>
          </div>

          <div className="flex items-start gap-3 rounded-md bg-blue/10 px-3 py-2">
            <Info className="mt-0.5 size-4 shrink-0 text-blue" />
            <p className="font-rubik text-xs leading-4 text-blue">
              The selected Admin will receive an email with a link to this invoice. After approval,
              the invoice will be moved back to the Floor queue and can be edited by a Floor
              Manager.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField label="Invoice" value={`#${invoice.invoiceNumber}`} />
            <ReadOnlyField label="Customer" value={invoice.customerName} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ReadOnlyField label="Invoice Total" value={formatCents(invoice.total)} />
            <ReadOnlyField label="Amount Paid" value={formatCents(invoice.paid)} />
            <ReadOnlyField
              label="Outstanding Balance"
              value={formatCents(invoice.total - invoice.paid)}
            />
          </div>

          <div className="h-px bg-field-line" />

          <div className="flex flex-col gap-2">
            <span className="font-rubik text-sm leading-4.5 font-medium text-body">
              Select Admin to Approve <span className="text-red">*</span>
            </span>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ghost" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Admin users..."
                className="flex h-9 w-full rounded-md border border-field-line bg-white pr-3 pl-9 font-rubik text-sm text-body outline-none placeholder:text-ghost focus:border-blue"
              />
            </div>
            <div
              role="radiogroup"
              aria-label="Select Admin to Approve"
              className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border border-field-line p-1"
            >
              {adminsQuery.isLoading ? (
                <div className="h-12 animate-pulse rounded-md bg-page" />
              ) : admins.length === 0 ? (
                <p className="px-3 py-2 font-rubik text-sm text-label">No admin users found</p>
              ) : (
                admins.map((admin) => {
                  const selected = admin.id === adminId;
                  return (
                    <button
                      key={admin.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAdminId(admin.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                        selected ? "bg-blue/10" : "hover:bg-page",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-blue" : "border-field-line",
                        )}
                      >
                        {selected && <span className="size-2 rounded-full bg-blue" />}
                      </span>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page font-rubik text-xs font-medium text-body">
                        {initials(admin.name)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-rubik text-sm leading-4.5 text-body">
                          {admin.name}
                        </span>
                        <span className="truncate font-rubik text-xs leading-4 text-label">
                          {admin.email}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="modification-reason"
              className="font-rubik text-sm leading-4.5 text-body"
            >
              Reason for Modification (Optional)
            </label>
            <textarea
              id="modification-reason"
              value={reason}
              maxLength={REASON_LIMIT}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide details about the changes needed to this invoice..."
              className="h-20 w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-4.5 text-body outline-none placeholder:text-ghost focus:border-blue"
            />
            <span className="self-end font-rubik text-xs text-label">
              {reason.length}/{REASON_LIMIT}
            </span>
          </div>

          <DialogFooter className="justify-end p-0">
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              disabled={!adminId || sendRequest.isPending}
              onClick={() =>
                adminId &&
                sendRequest.mutate({
                  invoiceId: invoice.id,
                  assignedAdminId: adminId,
                  reason: reason.trim() || undefined,
                })
              }
            >
              {sendRequest.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
