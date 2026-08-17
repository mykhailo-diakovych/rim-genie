import { useEffect, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Mail, MessageSquare, Send } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type SendChannel = "email" | "sms";

export interface SendQuoteCustomer {
  name: string;
  email: string | null;
  phone: string | null;
  communicationPreference: string;
}

interface SendQuoteDialogProps {
  quoteId: string | null;
  customer: SendQuoteCustomer | null | undefined;
  onClose: () => void;
  onSent?: () => void;
}

function ChannelOption({
  channel,
  address,
  selected,
  preferred,
  onSelect,
}: {
  channel: SendChannel;
  address: string | null;
  selected: boolean;
  preferred: boolean;
  onSelect: () => void;
}) {
  const available = !!address;
  const Icon = channel === "email" ? Mail : MessageSquare;

  return (
    <button
      type="button"
      disabled={!available}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
        selected ? "border-blue bg-blue/5" : "border-field-line bg-white",
        available ? "cursor-pointer hover:border-blue/50" : "cursor-not-allowed opacity-50",
      )}
    >
      <Icon className={cn("size-4 shrink-0", selected ? "text-blue" : "text-ghost")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="font-rubik text-sm leading-4.5 font-medium text-body">
            {channel === "email" ? "Email" : "SMS"}
          </span>
          {preferred && (
            <span className="rounded bg-badge-blue px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white">
              Preferred
            </span>
          )}
        </span>
        <span className="truncate font-rubik text-xs leading-4 text-label">
          {address ?? (channel === "email" ? "No email on file" : "No mobile number on file")}
        </span>
      </span>
    </button>
  );
}

/**
 * One send path for every entry point. Both callers previously fired the same
 * mutation behind a dialog whose copy always claimed "via email", so the label
 * disagreed with what was actually sent whenever the customer preferred SMS.
 */
export function SendQuoteDialog({ quoteId, customer, onClose, onSent }: SendQuoteDialogProps) {
  const preferred: SendChannel = customer?.communicationPreference === "email" ? "email" : "sms";
  const [channel, setChannel] = useState<SendChannel>(preferred);

  // Fall back to whichever channel the customer actually has an address for, so a
  // stored preference with nothing to send to doesn't dead-end the user.
  useEffect(() => {
    if (!customer) return;
    const canUse = (c: SendChannel) => (c === "email" ? !!customer.email : !!customer.phone);
    setChannel(canUse(preferred) ? preferred : canUse("email") ? "email" : "sms");
  }, [customer, preferred]);

  const sendQuote = useMutation({
    ...orpc.floor.quotes.send.mutationOptions(),
    onSuccess: () => {
      toast.success(`Quote sent via ${channel === "email" ? "email" : "SMS"}`);
      onSent?.();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const address = channel === "email" ? customer?.email : customer?.phone;
  const canSend = !!quoteId && !!address && !sendQuote.isPending;

  return (
    <Dialog
      open={!!quoteId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[380px]">
        <div className="flex flex-col gap-5 px-3 pt-4 pb-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border-8 border-blue/10 bg-blue/20">
              <Send className="size-6 text-blue" />
            </div>
            <DialogTitle>Send Quote to Customer?</DialogTitle>
            <DialogDescription>
              Choose how to send this quote to {customer?.name ?? "the customer"}.
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-2">
            <ChannelOption
              channel="email"
              address={customer?.email ?? null}
              selected={channel === "email"}
              preferred={preferred === "email"}
              onSelect={() => setChannel("email")}
            />
            <ChannelOption
              channel="sms"
              address={customer?.phone ?? null}
              selected={channel === "sms"}
              preferred={preferred === "sms"}
              onSelect={() => setChannel("sms")}
            />
          </div>

          {!customer?.email && !customer?.phone && (
            <p className="font-rubik text-xs leading-4 text-red">
              This customer has no email address or mobile number on file.
            </p>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              }
            />
            <Button
              className="w-32"
              disabled={!canSend}
              onClick={() => quoteId && sendQuote.mutate({ quoteId, channel })}
            >
              {sendQuote.isPending ? "Sending..." : "Send Quote"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
