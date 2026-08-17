import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronUp, Info, Lock, Mail, Printer } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/cashier/$invoiceId/checkout")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Collect Payment" }],
  }),
  component: CheckoutPage,
});

// ─── Money ────────────────────────────────────────────────────────────────────
// Everything settles in integer cents. Dollar floats were what let an exact
// payment read as an overpayment and disable the confirm button.

function toCents(input: string): number {
  const n = parseFloat(input);
  return isNaN(n) || n < 0 ? 0 : Math.round(n * 100);
}

function toCount(input: string): number {
  const n = parseInt(input, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

// Notes are a COUNT × face value; coins is a straight amount with decimals.
// Conflating the two is what silently dropped the cents on every cash payment.
const CASH_DENOMINATIONS = [
  { key: "5000", label: "$5,000 notes", faceCents: 500000, isAmount: false },
  { key: "1000", label: "$1,000 notes", faceCents: 100000, isAmount: false },
  { key: "500", label: "$500 notes", faceCents: 50000, isAmount: false },
  { key: "100", label: "$100 notes", faceCents: 10000, isAmount: false },
  { key: "50", label: "$50 notes", faceCents: 5000, isAmount: false },
  { key: "coins", label: "Coins", faceCents: 0, isAmount: true },
] as const;

function breakdownCents(counts: Record<string, string>): number {
  return CASH_DENOMINATIONS.reduce((sum, d) => {
    const raw = counts[d.key] ?? "";
    if (!raw) return sum;
    return sum + (d.isAmount ? toCents(raw) : toCount(raw) * d.faceCents);
  }, 0);
}

type CardMethod = "credit" | "debit" | "cheque" | "bank";

const CARD_METHODS: {
  key: CardMethod;
  label: string;
  sublabel?: string;
  iconSrc: string;
  apiMode: "credit_card" | "debit_card" | "cheque" | "bank_transfer";
  hasReference?: boolean;
}[] = [
  {
    key: "credit",
    label: "Credit / Debit Card",
    sublabel: "Visa, Mastercard, AMEX",
    iconSrc: "/icons/payment/credit.svg",
    apiMode: "credit_card",
  },
  { key: "debit", label: "Debit (POS)", iconSrc: "/icons/payment/debit.svg", apiMode: "debit_card" },
  {
    key: "cheque",
    label: "Cheque",
    iconSrc: "/icons/payment/cheque.svg",
    apiMode: "cheque",
    hasReference: true,
  },
  {
    key: "bank",
    label: "Bank Transfer",
    iconSrc: "/icons/payment/bank.svg",
    apiMode: "bank_transfer",
    hasReference: true,
  },
];

type CollectMode = "full" | "deposit" | "custom";

// ─── Pieces ───────────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue font-rubik text-xs leading-none text-white">
      {n}
    </span>
  );
}

function AmountOption({
  label,
  amount,
  hint,
  selected,
  onSelect,
  children,
}: {
  label: string;
  amount?: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-blue bg-blue/5" : "border-field-line bg-white hover:border-blue/50",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-blue" : "border-toggle-line",
          )}
        >
          {selected && <span className="size-2 rounded-full bg-blue" />}
        </span>
        <span className="font-rubik text-sm leading-4.5 text-body">{label}</span>
      </span>
      {amount && (
        <span className="font-rubik text-base leading-5 font-medium text-body">{amount}</span>
      )}
      {hint && <span className="font-rubik text-xs leading-3.5 text-green">{hint}</span>}
      {children}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "green" | "blue";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "font-rubik text-sm leading-4.5",
          emphasis ? "font-medium text-body" : "text-label",
          tone === "green" && "text-green",
          tone === "blue" && "text-blue",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-rubik text-sm leading-4.5 text-body",
          emphasis && "font-medium",
          tone === "green" && "font-medium text-green",
          tone === "blue" && "font-medium text-blue",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CheckoutPage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invoiceQuery = useQuery(
    orpc.cashier.invoices.get.queryOptions({ input: { id: invoiceId } }),
  );
  const inv = invoiceQuery.data;

  const invoiceTotalCents = inv?.total ?? 0;
  const previouslyPaidCents = inv?.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const [collectMode, setCollectMode] = useState<CollectMode>("deposit");
  const [customAmount, setCustomAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [cashCounts, setCashCounts] = useState<Record<string, string>>({});
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [cardAmounts, setCardAmounts] = useState<Record<CardMethod, string>>({
    credit: "",
    debit: "",
    cheque: "",
    bank: "",
  });
  const [cardRefs, setCardRefs] = useState<Record<CardMethod, string>>({
    credit: "",
    debit: "",
    cheque: "",
    bank: "",
  });
  const [expanded, setExpanded] = useState<CardMethod | null>(null);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const sendReceipt = useMutation(
    orpc.cashier.invoices.sendReceipt.mutationOptions({
      onSuccess: () => toast.success("Receipt sent to customer"),
      onError: (err) => toast.error(err.message),
    }),
  );

  // A discount reduces what is owed, so it has to land before the deposit is
  // derived — otherwise "50%" is half of the pre-discount figure.
  const discountCents = toCents(discount);
  const balanceCents = Math.max(0, invoiceTotalCents - discountCents - previouslyPaidCents);
  const depositCents = Math.round(balanceCents / 2);

  const collectCents =
    collectMode === "full"
      ? balanceCents
      : collectMode === "deposit"
        ? depositCents
        : Math.min(toCents(customAmount), balanceCents);

  const cashCents = toCents(cashReceived);
  const cardCents = CARD_METHODS.reduce((sum, m) => sum + toCents(cardAmounts[m.key]), 0);
  const receivedCents = cashCents + cardCents;

  const changeCents = Math.max(0, receivedCents - collectCents);
  const remainingCents = Math.max(0, balanceCents - collectCents);

  // Change can only come out of the cash drawer, so a card/cheque tender that
  // overshoots is not something the cashier can hand back.
  const changeExceedsCash = changeCents > cashCents;
  const shortfall = receivedCents < collectCents;

  const canComplete =
    !isSubmitting && collectCents > 0 && !shortfall && !changeExceedsCash && balanceCents > 0;

  function setCashCount(key: string, value: string) {
    const next = { ...cashCounts, [key]: value };
    setCashCounts(next);
    // The breakdown is a counting aid: totalling the drawer fills in the amount
    // received, which stays the authoritative figure and can be typed over.
    setCashReceived((breakdownCents(next) / 100).toFixed(2));
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      const trimmedNotes = notes.trim();
      if (discountCents > 0 || trimmedNotes) {
        await orpc.cashier.invoices.update.call({
          id: invoiceId,
          ...(discountCents > 0 && { discount: discountCents }),
          ...(trimmedNotes && { notes: trimmedNotes }),
        });
      }

      // Record what is applied to the invoice, not what was handed over: the
      // change comes back out of the cash tender so the entries sum to exactly
      // the amount being collected.
      const entries = [
        { mode: "cash" as const, amount: cashCents - changeCents, reference: undefined },
        ...CARD_METHODS.map((m) => ({
          mode: m.apiMode,
          amount: toCents(cardAmounts[m.key]),
          reference: cardRefs[m.key]?.trim() || undefined,
        })),
      ].filter((e) => e.amount > 0);

      for (const entry of entries) {
        await orpc.cashier.payments.record.call({
          invoiceId,
          amount: entry.amount,
          mode: entry.mode,
          reference: entry.reference,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: orpc.cashier.invoices.get.key({ input: { id: invoiceId } }),
      });
      await queryClient.invalidateQueries({ queryKey: orpc.cashier.invoices.list.key() });
      toast.success("Payment recorded");
      setShowSuccess(true);
    } catch (err) {
      toast.error(`Payment failed: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link to="/cashier/$invoiceId" params={{ invoiceId }} />}
          >
            <ChevronLeft />
            Back
          </Button>
          <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
            Collect Payment
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-rubik text-sm leading-4.5">
          <span className="text-label">
            Invoice{" "}
            <span className="text-body">
              #{inv ? `INV-${String(inv.invoiceNumber).padStart(4, "0")}` : "—"}
            </span>
          </span>
          <span className="text-label">
            Customer: <span className="text-body">{inv?.customer?.name ?? "—"}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* ── Left: steps ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Step 1 */}
          <section className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card sm:p-4">
            <div className="flex items-center gap-2">
              <StepBadge n={1} />
              <h2 className="font-rubik text-base leading-5 font-medium text-body">
                Amount to collect
              </h2>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-rubik text-xs leading-3.5 text-label">
                Invoice balance due
              </span>
              <span className="font-rubik text-[22px] leading-6.5 font-medium text-body">
                {formatCents(balanceCents)}
              </span>
            </div>

            <span className="font-rubik text-xs leading-3.5 text-label">
              Choose how much to collect today
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <AmountOption
                label="Full balance"
                amount={formatCents(balanceCents)}
                selected={collectMode === "full"}
                onSelect={() => setCollectMode("full")}
              />
              <AmountOption
                label="50% deposit"
                amount={formatCents(depositCents)}
                hint="Recommended"
                selected={collectMode === "deposit"}
                onSelect={() => setCollectMode("deposit")}
              />
              <AmountOption
                label="Custom amount"
                selected={collectMode === "custom"}
                onSelect={() => setCollectMode("custom")}
              >
                <span className="flex h-9 items-center gap-1 rounded-md border border-field-line bg-white px-2">
                  <span className="font-rubik text-xs text-label">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customAmount}
                    onFocus={() => setCollectMode("custom")}
                    // Also on change, so pasting or autofilling into the field
                    // selects it rather than silently editing an inactive option.
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setCollectMode("custom");
                    }}
                    placeholder="0.00"
                    className="w-full bg-transparent font-rubik text-xs text-body outline-none placeholder:text-ghost"
                  />
                </span>
              </AmountOption>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue/5 px-3 py-2">
              <Info className="mt-0.5 size-4 shrink-0 text-blue" />
              <span className="font-rubik text-xs leading-4 text-body">
                Remaining invoice balance after this payment:{" "}
                <span className="font-medium">{formatCents(remainingCents)}</span>
              </span>
            </div>
          </section>

          {/* Step 2 */}
          <section className="flex flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card sm:p-4">
            <div className="flex items-center gap-2">
              <StepBadge n={2} />
              <h2 className="font-rubik text-base leading-5 font-medium text-body">
                Payment method
              </h2>
            </div>
            <span className="font-rubik text-xs leading-3.5 text-label">
              Enter how the customer is paying the amount above.
            </span>

            {/* Cash */}
            <div className="flex flex-col gap-3 rounded-lg border border-field-line p-3">
              <div className="flex items-center gap-2">
                <img src="/icons/payment/cash.svg" alt="" className="size-5" />
                <span className="font-rubik text-sm leading-4.5 font-medium text-body">Cash</span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label className="flex flex-col gap-1 sm:w-52">
                  <span className="font-rubik text-xs leading-3.5 text-label">
                    Cash amount received
                  </span>
                  <span className="flex h-9 items-center gap-1 rounded-md border border-field-line bg-white px-2">
                    <span className="font-rubik text-xs text-label">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent font-rubik text-sm text-body outline-none placeholder:text-ghost"
                    />
                  </span>
                </label>

                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:border-l sm:border-field-line sm:pl-3">
                  <button
                    type="button"
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="flex cursor-pointer items-center gap-1.5 self-start"
                  >
                    <span className="font-rubik text-xs leading-3.5 text-label">
                      Cash breakdown (optional)
                    </span>
                    {showBreakdown ? (
                      <ChevronUp className="size-3.5 text-label" />
                    ) : (
                      <ChevronDown className="size-3.5 text-label" />
                    )}
                  </button>
                  {showBreakdown && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CASH_DENOMINATIONS.map((d) => (
                        <label key={d.key} className="flex flex-col gap-1">
                          <span className="font-rubik text-xs leading-3.5 text-label">
                            {d.label}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step={d.isAmount ? "0.01" : "1"}
                            value={cashCounts[d.key] ?? ""}
                            onChange={(e) => setCashCount(d.key, e.target.value)}
                            placeholder="0"
                            className="h-9 rounded-md border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Other tenders */}
            {CARD_METHODS.map((m) => {
              const open = expanded === m.key;
              return (
                <div key={m.key} className="rounded-lg border border-field-line">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : m.key)}
                    className="flex w-full cursor-pointer items-center gap-3 p-3 text-left"
                  >
                    <img src={m.iconSrc} alt="" className="size-5 shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-rubik text-sm leading-4.5 font-medium text-body">
                        {m.label}
                      </span>
                      {m.sublabel && (
                        <span className="font-rubik text-xs leading-3.5 text-label">
                          {m.sublabel}
                        </span>
                      )}
                    </span>
                    <span className="font-rubik text-sm leading-4.5 text-body">
                      {formatCents(toCents(cardAmounts[m.key]))}
                    </span>
                    {open ? (
                      <ChevronUp className="size-4 shrink-0 text-label" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-label" />
                    )}
                  </button>
                  {open && (
                    <div className="flex flex-col gap-3 border-t border-field-line p-3 sm:flex-row">
                      <label className="flex flex-col gap-1 sm:w-52">
                        <span className="font-rubik text-xs leading-3.5 text-label">Amount</span>
                        <span className="flex h-9 items-center gap-1 rounded-md border border-field-line bg-white px-2">
                          <span className="font-rubik text-xs text-label">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cardAmounts[m.key]}
                            onChange={(e) =>
                              setCardAmounts((prev) => ({ ...prev, [m.key]: e.target.value }))
                            }
                            placeholder="0.00"
                            className="w-full bg-transparent font-rubik text-sm text-body outline-none placeholder:text-ghost"
                          />
                        </span>
                      </label>
                      {m.hasReference && (
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="font-rubik text-xs leading-3.5 text-label">
                            Reference
                          </span>
                          <input
                            type="text"
                            value={cardRefs[m.key]}
                            onChange={(e) =>
                              setCardRefs((prev) => ({ ...prev, [m.key]: e.target.value }))
                            }
                            placeholder={m.key === "cheque" ? "Cheque number" : "Transaction ref"}
                            className="h-9 rounded-md border border-field-line bg-white px-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Received / change bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue/5 px-3 py-2">
              <span className="flex flex-col">
                <span className="font-rubik text-xs leading-3.5 text-label">
                  Total amount received
                </span>
                <span className="font-rubik text-base leading-5 font-medium text-body">
                  {formatCents(receivedCents)}
                </span>
              </span>
              <span className="flex flex-col text-right">
                <span className="font-rubik text-xs leading-3.5 text-label">
                  Change due to customer
                </span>
                <span className="font-rubik text-base leading-5 font-medium text-green">
                  {formatCents(changeCents)}
                </span>
              </span>
            </div>
          </section>
        </div>

        {/* ── Right: summary ── */}
        <aside className="flex w-full flex-col gap-3 rounded-xl border border-card-line bg-white p-3 shadow-card sm:p-4 lg:sticky lg:top-0 lg:w-80">
          <div className="flex items-center justify-between">
            <h2 className="font-rubik text-base leading-5 font-medium text-body">
              Payment Summary
            </h2>
            <Button
              variant="ghost"
              onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, "_blank")}
            >
              <Printer />
              Print
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <SummaryRow label="Invoice total" value={formatCents(invoiceTotalCents)} />
            <SummaryRow label="Previously paid" value={formatCents(previouslyPaidCents)} />
            <div className="h-px bg-field-line" />
            <SummaryRow label="Balance due" value={formatCents(balanceCents)} emphasis />
            <SummaryRow
              label="Payment amount (today)"
              value={formatCents(collectCents)}
              tone="blue"
            />

            <label className="flex items-center justify-between gap-3">
              <span className="font-rubik text-sm leading-4.5 text-label">Discount</span>
              <span className="flex h-9 w-32 items-center gap-1 rounded-md border border-field-line bg-white px-2">
                <span className="font-rubik text-xs text-label">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-right font-rubik text-xs text-body outline-none placeholder:text-ghost"
                />
              </span>
            </label>

            <div className="h-px bg-field-line" />
            <SummaryRow
              label="Total amount received"
              value={formatCents(receivedCents)}
              tone="green"
            />
            <SummaryRow label="Change due" value={formatCents(changeCents)} tone="green" />
            <div className="h-px bg-field-line" />
            <SummaryRow
              label="Remaining invoice balance"
              value={formatCents(remainingCents)}
              emphasis
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-blue/5 px-3 py-2">
            <Info className="mt-0.5 size-4 shrink-0 text-blue" />
            <span className="font-rubik text-xs leading-4 text-label">
              This is the amount that will remain on the invoice after this payment.
            </span>
          </div>

          {shortfall && collectCents > 0 && (
            <p className="font-rubik text-xs leading-4 text-red">
              Short by {formatCents(collectCents - receivedCents)} — enter how the customer is
              paying.
            </p>
          )}
          {changeExceedsCash && (
            <p className="font-rubik text-xs leading-4 text-red">
              Change can only be given from cash. Reduce the card, cheque or transfer amount.
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="font-rubik text-xs leading-3.5 text-label">Notes (optional)</span>
            <textarea
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes about this payment..."
              className="min-h-[72px] rounded-md border border-field-line bg-white p-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
            />
            <span className="self-end font-rubik text-xs leading-3.5 text-ghost">
              {notes.length} / 500
            </span>
          </label>

          <Button fullWidth disabled={!canComplete} onClick={handleConfirm}>
            <Lock />
            {isSubmitting ? "Processing..." : "Complete Payment"}
          </Button>
        </aside>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Confirmed</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-3">
            <DialogDescription>
              {changeCents > 0
                ? `Payment recorded. Change due to customer: ${formatCents(changeCents)}.`
                : "Payment has been recorded successfully."}
            </DialogDescription>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, "_blank")}
              >
                <Printer /> Print Receipt
              </Button>
              <Button
                onClick={() => sendReceipt.mutate({ invoiceId })}
                disabled={sendReceipt.isPending}
              >
                <Mail /> Send to Customer
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccess(false);
                  navigate({ to: "/cashier/$invoiceId", params: { invoiceId } });
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
