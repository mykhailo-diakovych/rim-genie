import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CreditCard,
  FileCheck,
  Landmark,
  Wallet,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/cashier/$invoiceId/checkout")({
  component: CheckoutPage,
});

const CASH_DENOMINATIONS = [
  { value: 5000, label: "5,000 notes" },
  { value: 1000, label: "1,000 notes" },
  { value: 500, label: "500 notes" },
  { value: 100, label: "100 notes" },
  { value: 50, label: "50 notes" },
  { value: 0, label: "Coins" },
] as const;

type PaymentMethod = "cash" | "credit" | "debit" | "cheque" | "bank";

const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  icon: typeof Banknote;
  apiMode: "cash" | "credit_card" | "debit_card" | "cheque" | "bank_transfer";
}[] = [
  { key: "cash", label: "Cash", icon: Banknote, apiMode: "cash" },
  { key: "credit", label: "Credit", icon: CreditCard, apiMode: "credit_card" },
  { key: "debit", label: "Debit", icon: Wallet, apiMode: "debit_card" },
  { key: "cheque", label: "Cheque", icon: FileCheck, apiMode: "cheque" },
  { key: "bank", label: "Bank Transfer", icon: Landmark, apiMode: "bank_transfer" },
];

function formatDollars(dollars: number) {
  return `$${dollars.toFixed(2)}`;
}

function PaymentAccordionHeader({
  icon: Icon,
  label,
  isOpen,
  onClick,
}: {
  icon: typeof Banknote;
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between p-3",
        isOpen && "border-b border-field-line",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-6" />
        <span
          className={cn("font-rubik text-base font-medium", isOpen ? "text-blue" : "text-body")}
        >
          {label}
        </span>
      </div>
      {isOpen ? (
        <ChevronUp className="size-4 text-label" />
      ) : (
        <ChevronDown className="size-4 text-label" />
      )}
    </button>
  );
}

function CashContent({
  counts,
  onChange,
}: {
  counts: Record<number, string>;
  onChange: (denomValue: number, inputValue: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="font-rubik text-sm text-label">Cash breakdown:</span>
      <div className="flex flex-col gap-1">
        {CASH_DENOMINATIONS.map((denom) => (
          <div key={denom.value} className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={counts[denom.value] ?? ""}
              onChange={(e) => onChange(denom.value, e.target.value)}
              className="h-9 w-[120px] rounded-md border border-field-line bg-white p-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
            />
            <span className="font-rubik text-sm font-medium text-body">× {denom.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AmountContent({
  amount,
  onAmountChange,
  reference,
  onReferenceChange,
  referencePlaceholder,
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  reference?: string;
  onReferenceChange?: (value: string) => void;
  referencePlaceholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <label className="flex flex-col gap-1">
        <span className="font-rubik text-xs text-label">Amount ($)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          className="h-9 rounded-md border border-field-line bg-white p-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
        />
      </label>
      {onReferenceChange && (
        <label className="flex flex-col gap-1">
          <span className="font-rubik text-xs text-label">Reference</span>
          <input
            type="text"
            value={reference ?? ""}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder={referencePlaceholder}
            className="h-9 rounded-md border border-field-line bg-white p-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
          />
        </label>
      )}
    </div>
  );
}

function CheckoutPage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invoiceQuery = useQuery(
    orpc.cashier.invoices.get.queryOptions({ input: { id: invoiceId } }),
  );
  const inv = invoiceQuery.data;
  const totalPaid = inv?.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const balanceCents = (inv?.total ?? 0) - totalPaid;
  const balanceDollars = balanceCents / 100;

  const [expanded, setExpanded] = useState<PaymentMethod | null>("cash");
  const [cashCounts, setCashCounts] = useState<Record<number, string>>({});
  const [creditAmount, setCreditAmount] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [chequeAmount, setChequeAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [chequeRef, setChequeRef] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cashTotal = CASH_DENOMINATIONS.reduce((sum, denom) => {
    const count = parseInt(cashCounts[denom.value] || "0", 10);
    if (isNaN(count) || count < 0) return sum;
    if (denom.value === 0) return sum + count;
    return sum + count * denom.value;
  }, 0);

  const creditTotal = parseFloat(creditAmount) || 0;
  const debitTotal = parseFloat(debitAmount) || 0;
  const chequeTotal = parseFloat(chequeAmount) || 0;
  const bankTotal = parseFloat(bankAmount) || 0;
  const grandTotal = cashTotal + creditTotal + debitTotal + chequeTotal + bankTotal;
  const totalDue = grandTotal - balanceDollars;

  const paymentEntries = [
    { mode: "cash" as const, amount: cashTotal, reference: undefined as string | undefined },
    {
      mode: "credit_card" as const,
      amount: creditTotal,
      reference: undefined as string | undefined,
    },
    { mode: "debit_card" as const, amount: debitTotal, reference: undefined as string | undefined },
    { mode: "cheque" as const, amount: chequeTotal, reference: chequeRef || undefined },
    { mode: "bank_transfer" as const, amount: bankTotal, reference: bankRef || undefined },
  ].filter((e) => e.amount > 0);

  async function handleConfirm() {
    if (paymentEntries.length === 0) {
      toast.error("Enter at least one payment amount");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const entry of paymentEntries) {
        const cents = Math.round(entry.amount * 100);
        await orpc.cashier.payments.record.call({
          invoiceId,
          amount: cents,
          mode: entry.mode,
          reference: entry.reference?.trim() || undefined,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: orpc.cashier.invoices.get.key({ input: { id: invoiceId } }),
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.cashier.invoices.list.key(),
      });
      toast.success("Payment recorded");
      navigate({ to: "/cashier/$invoiceId", params: { invoiceId } });
    } catch (err) {
      toast.error(`Payment failed: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleAccordion(method: PaymentMethod) {
    setExpanded((prev) => (prev === method ? null : method));
  }

  function handleCashCountChange(denomValue: number, inputValue: string) {
    setCashCounts((prev) => ({ ...prev, [denomValue]: inputValue }));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-5 pb-0">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/cashier/$invoiceId" params={{ invoiceId }} />}
        >
          <ChevronLeft />
          Back
        </Button>
      </div>

      <div className="flex flex-1 items-start gap-4 p-5">
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
            Payment method
          </h1>

          <div className="flex flex-col gap-2">
            {PAYMENT_METHODS.map(({ key, label, icon }) => {
              const isOpen = expanded === key;
              return (
                <div key={key} className="rounded-xl bg-white">
                  <PaymentAccordionHeader
                    icon={icon}
                    label={label}
                    isOpen={isOpen}
                    onClick={() => toggleAccordion(key)}
                  />

                  {isOpen && key === "cash" && (
                    <CashContent counts={cashCounts} onChange={handleCashCountChange} />
                  )}

                  {isOpen && key === "credit" && (
                    <AmountContent amount={creditAmount} onAmountChange={setCreditAmount} />
                  )}

                  {isOpen && key === "debit" && (
                    <AmountContent amount={debitAmount} onAmountChange={setDebitAmount} />
                  )}

                  {isOpen && key === "cheque" && (
                    <AmountContent
                      amount={chequeAmount}
                      onAmountChange={setChequeAmount}
                      reference={chequeRef}
                      onReferenceChange={setChequeRef}
                      referencePlaceholder="Cheque number"
                    />
                  )}

                  {isOpen && key === "bank" && (
                    <AmountContent
                      amount={bankAmount}
                      onAmountChange={setBankAmount}
                      reference={bankRef}
                      onReferenceChange={setBankRef}
                      referencePlaceholder="Transaction ID"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-[284px] shrink-0 rounded-xl bg-white py-3">
          <div className="px-3">
            <h2 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
              Order summary:
            </h2>
          </div>

          <div className="mt-4 flex flex-col gap-1 px-3">
            <div className="flex items-start p-2 font-rubik text-base leading-5">
              <span className="flex-1 text-body">Total Due:</span>
              <span className={cn("font-medium", totalDue < 0 ? "text-red" : "text-green")}>
                {formatDollars(totalDue)}
              </span>
            </div>

            <div className="h-px bg-field-line" />

            <div className="flex flex-col gap-1 py-2">
              <div className="flex items-start px-2 font-rubik text-base leading-5 text-body">
                <span className="flex-1">Total:</span>
                <span className="font-medium">{formatDollars(grandTotal)}</span>
              </div>

              <div className="flex flex-col gap-1 pl-3">
                {[
                  { label: "Cash", amount: cashTotal },
                  { label: "Credit", amount: creditTotal },
                  { label: "Debit", amount: debitTotal },
                  { label: "Cheque", amount: chequeTotal },
                  { label: "Bank", amount: bankTotal },
                ].map(({ label, amount }) => (
                  <div
                    key={label}
                    className="flex items-start px-2 font-rubik text-sm leading-[18px]"
                  >
                    <span className="flex-1 text-label">{label}</span>
                    <span className="text-body">{formatDollars(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-field-line" />

          <div className="flex flex-col gap-1 px-3 pt-4">
            <span className="font-rubik text-xs text-label">Discount:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="h-9 rounded-md border border-field-line bg-white p-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
            />
          </div>

          <div className="mt-4 h-px bg-field-line" />

          <div className="flex flex-col gap-1 px-3 pt-4">
            <span className="font-rubik text-xs text-label">Notes:</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter note"
              className="min-h-[72px] rounded-md border border-field-line bg-white p-2 font-rubik text-xs text-body outline-none placeholder:text-ghost"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-card-line bg-white px-5 py-3">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to="/cashier/$invoiceId" params={{ invoiceId }} />}
        >
          Cancel
        </Button>
        <Button
          color="success"
          onClick={handleConfirm}
          disabled={isSubmitting || paymentEntries.length === 0}
        >
          Confirm Payment
        </Button>
      </div>
    </div>
  );
}
