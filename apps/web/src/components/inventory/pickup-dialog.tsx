import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FilePenLine } from "lucide-react";
import { toast } from "sonner";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturePadField } from "@/components/ui/signature-pad-field";
import { formatCents } from "@/lib/format-currency";
import { client, orpc } from "@/utils/orpc";

import { formatInvoiceNumber, getInvoiceBalance, invoiceJobsInOrder } from "./invoice-pickup";
import type { ApiJob } from "./types";

type ApiInvoice = ApiJob["invoice"];

interface PickupDialogProps {
  invoice: ApiInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PickupDialog({ invoice, open, onOpenChange }: PickupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <PickupDialogBody invoice={invoice} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InvoiceJobList({ invoice }: { invoice: ApiInvoice }) {
  const jobs = invoiceJobsInOrder(invoice);
  return (
    <ul className="flex flex-col gap-1 font-rubik text-sm leading-4.5">
      {jobs.map((j, i) => (
        <li key={j.id} className="flex items-baseline gap-2">
          <span className="shrink-0 text-label">
            Job {i + 1} of {jobs.length}
          </span>
          <span className="min-w-0 truncate text-body">{j.invoiceItem.description ?? "—"}</span>
          {j.isPickedUp && <span className="shrink-0 text-xs text-label">(already picked up)</span>}
        </li>
      ))}
    </ul>
  );
}

function PickupDialogBody({ invoice, onDone }: { invoice: ApiInvoice; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const balance = getInvoiceBalance(invoice);
  const canPickup = signature !== null && balance <= 0;

  const mutation = useMutation({
    mutationFn: (signatureDataUrl: string) =>
      client.inventory.jobs.markInvoicePickup({
        invoiceId: invoice.id,
        signatureDataUrl,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.inventory.jobs.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.floor.customers.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.jobs.key() }),
      ]);
      toast.success(`${formatInvoiceNumber(invoice.invoiceNumber)} marked as picked up`);
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pickup</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-3 pt-0 pb-3">
        <div className="flex flex-col gap-2 border-b border-field-line pt-3 pb-2">
          <div className="flex items-baseline justify-between font-rubik text-sm leading-4.5">
            <span className="font-medium text-body">{invoice.customer.name}</span>
            <span className="text-body">{formatInvoiceNumber(invoice.invoiceNumber)}</span>
          </div>
          <InvoiceJobList invoice={invoice} />
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          <div className="flex flex-1 flex-col gap-4">
            {balance > 0 && (
              <div className="flex gap-2 rounded-md border border-red/30 bg-red/5 p-2 font-rubik text-xs leading-4.5 text-red">
                <CircleAlert className="size-4 shrink-0" />
                <span>
                  Outstanding balance of {formatCents(balance)}. The customer must pay the final
                  balance before pickup.
                </span>
              </div>
            )}

            <div className="flex flex-1 flex-col gap-1">
              <label className="font-rubik text-xs leading-3.5 text-label">Notes/Comments:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20 w-full flex-1 resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm leading-4.5 text-body outline-none placeholder:text-label focus:border-blue"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <Banner icon={<FilePenLine />}>
              Job completed to my satisfaction. Please sign below to confirm and pick up.
            </Banner>
            <span className="font-rubik text-xs leading-3.5 text-label">Customer Signature:</span>
            <SignaturePadField className="h-56" onChange={setSignature} />
          </div>
        </div>

        <DialogFooter className="p-0">
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          {canPickup && (
            <Button
              color="success"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(signature)}
            >
              {mutation.isPending ? "Processing..." : "Pickup"}
            </Button>
          )}
        </DialogFooter>
      </div>
    </>
  );
}
