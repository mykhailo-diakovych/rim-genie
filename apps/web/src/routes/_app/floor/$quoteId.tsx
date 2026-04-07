import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  FileCheck,
  FileSignature,
  Images,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Save,
  Send,
  SendHorizonal,
  Trash2,
  User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignatureModal } from "@/components/terms/signature-modal";
import { authClient } from "@/lib/auth-client";
import { formatCents, formatDollars } from "@/lib/format-currency";
import { client, orpc } from "@/utils/orpc";
import { QuoteGeneratorSheet } from "@/components/floor/quote-generator-sheet";
import type {
  QuoteGeneratorSheetData,
  QuoteGeneratorEditItem,
} from "@/components/floor/quote-generator-sheet";

export const Route = createFileRoute("/_app/floor/$quoteId")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Quote" }],
  }),
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
  const [editingItem, setEditingItem] = useState<QuoteGeneratorEditItem | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comments, setComments] = useState("");
  const [commentsSynced, setCommentsSynced] = useState(false);

  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const quoteQuery = useQuery(orpc.floor.quotes.get.queryOptions({ input: { id: quoteId } }));
  const quote = quoteQuery.data;
  const isReadOnly = quote?.status === "completed";

  const { data: pendingDiscount } = useQuery(
    orpc.discount.pendingForQuote.queryOptions({ input: { quoteId } }),
  );

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
      setRemoveConfirm(null);
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

  const deleteQuote = useMutation({
    ...orpc.floor.quotes.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      toast.success("Quote deleted");
      setShowDeleteConfirm(false);
      navigate({ to: "/floor" });
    },
    onError: (err) => toast.error(`Failed to delete: ${err.message}`),
  });

  // ─── Disclaimer & Actions ───────────────────────────────────────────────────
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [sendQuoteConfirm, setSendQuoteConfirm] = useState(false);
  const [sendToCashierConfirm, setSendToCashierConfirm] = useState(false);
  const [signedDocOpen, setSignedDocOpen] = useState(false);

  const { data: termsSignatureData } = useQuery(
    orpc.floor.termsSignature.getByQuoteId.queryOptions({ input: { quoteId } }),
  );
  const isSigned = !!termsSignatureData;

  const signDisclaimer = useMutation({
    ...orpc.floor.termsSignature.sign.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.floor.termsSignature.getByQuoteId.key({ input: { quoteId } }),
      });
      toast.success("Disclaimer signed successfully");
      setSignModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendQuote = useMutation({
    ...orpc.floor.quotes.send.mutationOptions(),
    onSuccess: () => {
      toast.success("Quote sent to customer");
      setSendQuoteConfirm(false);
    },
    onError: (err: Error) => toast.error(`Failed to send: ${err.message}`),
  });

  const sendToCashier = useMutation({
    ...orpc.floor.quotes.sendToCashier.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.quotes.key() });
      toast.success("Quote sent to cashier and converted to invoice");
      setSendToCashierConfirm(false);
      navigate({ to: "/floor" });
    },
    onError: (err: Error) => toast.error(`Failed to send to cashier: ${err.message}`),
  });

  function handleAdd(data: QuoteGeneratorSheetData) {
    addItem.mutate({
      quoteId,
      itemType: data.itemType ?? "rim",
      vehicleSize: data.vehicleSize ?? undefined,
      sideOfVehicle: data.sideOfVehicle ?? undefined,
      damageLevel: data.damageLevel ?? undefined,
      vehicleType: data.vehicleType ?? undefined,
      rimMaterial: data.rimMaterial ?? undefined,
      quantity: data.quantity,
      unitCost: data.unitCost,
      inches: data.inches,
      jobTypes: data.jobTypes,
      description: data.description || undefined,
    });
  }

  function handleEditItem(itemId: string, data: QuoteGeneratorSheetData) {
    updateItem.mutate({
      id: itemId,
      itemType: data.itemType ?? "rim",
      vehicleSize: data.vehicleSize ?? undefined,
      sideOfVehicle: data.sideOfVehicle ?? undefined,
      damageLevel: data.damageLevel ?? undefined,
      vehicleType: data.vehicleType ?? undefined,
      rimMaterial: data.rimMaterial ?? undefined,
      quantity: data.quantity,
      unitCost: data.unitCost,
      inches: data.inches ?? null,
      jobTypes: data.jobTypes,
      description: data.description || undefined,
    });
  }

  function handleSave() {
    updateQuote.mutate(
      { id: quoteId, comments },
      {
        onSuccess: () => {
          const hasItems = (quote?.items?.length ?? 0) > 0;
          toast.success(hasItems ? "Quote saved and sent to cashier" : "Quote saved");
        },
      },
    );
  }

  const [discountStr, setDiscountStr] = useState("");
  const [lastDiscountPercent, setLastDiscountPercent] = useState<number | null>(null);

  if (quote && quote.discountPercent !== lastDiscountPercent) {
    setDiscountStr(String(quote.discountPercent ?? 0));
    setLastDiscountPercent(quote.discountPercent ?? 0);
  }

  const subtotal = (quote?.subtotal ?? quote?.total ?? 0) / 100;
  const discountAmount = (quote?.discountAmount ?? 0) / 100;
  const total = (quote?.total ?? 0) / 100;
  const discountPercent = quote?.discountPercent ?? 0;

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
      <div className="flex flex-1 flex-col gap-5 p-3 sm:p-5">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <Button variant="outline" nativeButton={false} render={<Link to="/floor" />}>
            <ArrowLeft />
            Back to list
          </Button>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button
                onClick={() => setSendToCashierConfirm(true)}
                disabled={!isSigned || sendToCashier.isPending}
              >
                <SendHorizonal />
                Send to Cashier
              </Button>
            )}
            <Button
              color="success"
              onClick={handleSave}
              disabled={isReadOnly || updateQuote.isPending}
            >
              <Save />
              {updateQuote.isPending ? "Saving" : "Save"}
            </Button>
            <MoreDropdown
              quoteId={quoteId}
              customerEmail={quote?.customer?.email}
              customerPhone={quote?.customer?.phone}
              onDelete={() => setShowDeleteConfirm(true)}
              isDeleting={deleteQuote.isPending}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Invoice card */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-card-line bg-white p-3 shadow-card">
          {/* Row 1: Logo + Title */}
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="Rim Genie" className="h-12 w-auto" />
            <h2 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
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

          {/* Row 2: Reason for visit + Customer info */}
          {quote && (
            <div className="flex items-center gap-4">
              <div className="flex flex-1 items-center gap-4 font-rubik">
                <span className="shrink-0 text-xs leading-3.5 text-label">Reason for visit:</span>
                <span className="text-sm leading-[18px] text-body">
                  {quote.customerReason || "—"}
                </span>
              </div>

              <div className="hidden w-px self-stretch bg-field-line sm:block" />

              <div className="flex w-[200px] shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 font-rubik text-sm leading-[18px]">
                  <User className="size-4 shrink-0 text-ghost" />
                  <span className="font-medium text-body">{quote.customer?.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-rubik text-sm leading-[18px] text-body">
                  <Phone className="size-4 shrink-0 text-ghost" />
                  <span>{quote.customer?.phone}</span>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-field-line" />

          {/* Row 3: Dates + Address */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex flex-1 gap-4 font-rubik">
              <div className="flex flex-col gap-2">
                <span className="text-xs leading-3.5 text-label">Quote Date:</span>
                <span className="text-sm leading-4.5 text-body">
                  {quoteQuery.isLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    formatDate(quote?.createdAt)
                  )}
                </span>
              </div>
            </div>

            <div className="hidden w-px self-stretch bg-field-line sm:block" />

            <div className="flex flex-1 justify-end">
              <div className="flex flex-col gap-1 font-rubik text-sm leading-4.5 text-body">
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-rubik text-xs leading-3.5 text-label">
                Services to be Conducted:
              </span>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] font-rubik text-xs">
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
                      <th className="w-20 border-l border-field-line px-2 py-1.5 font-normal">
                        Total
                      </th>
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
                      <>
                        {/* Full Diagnostic Consent row */}
                        {quote && (
                          <tr className="border-t border-field-line align-top">
                            <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                              1
                            </td>
                            <td className="border-l border-field-line px-2 py-2">
                              <div className="flex flex-col gap-2">
                                <span className="text-sm leading-[18px] text-body">
                                  Full Diagnostic Service
                                </span>
                                <div className="flex gap-1 text-sm leading-[18px]">
                                  <span className="text-label">Comments:</span>
                                  <span className="text-body">
                                    {quote.fullDiagnosticConsent ? "Agree" : "Disagree"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                              —
                            </td>
                            <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                              $0.00
                            </td>
                            <td className="border-l border-field-line px-2 py-2 text-sm text-body">
                              $0.00
                            </td>
                            <td className="border-r border-l border-field-line px-2 py-2">
                              {!isReadOnly && (
                                <Button className="w-full" variant="outline" onClick={() => {}}>
                                  <Pencil className="size-3.5" />
                                  Edit
                                </Button>
                              )}
                            </td>
                          </tr>
                        )}
                        {(quote?.items ?? []).map((item, idx) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            index={idx + 1}
                            onRemove={() => setRemoveConfirm(item.id)}
                            onEdit={() => {
                              setEditingItem(item);
                              setSheetOpen(true);
                            }}
                            isRemoving={
                              removeItem.isPending && removeItem.variables?.id === item.id
                            }
                            isReadOnly={isReadOnly}
                          />
                        ))}
                      </>
                    )}

                    {!isReadOnly && (
                      <tr className="border-b border-field-line">
                        <td colSpan={6} className="border-r border-l border-field-line px-2 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(null);
                              setSheetOpen(true);
                            }}
                            className="flex items-center gap-1.5 rounded-md font-rubik text-sm leading-4.5 text-blue transition-opacity hover:opacity-70"
                          >
                            <Plus className="size-4" />
                            Add Job
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Services Excluded */}
            {quote && (
              <ServicesExcluded
                services={quote.excludedServices}
                onChanged={invalidateQuote}
                isReadOnly={isReadOnly}
              />
            )}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1">
            <label className="font-rubik text-xs leading-3.5 text-label">Comments:</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter note"
              rows={3}
              disabled={isReadOnly}
              className="w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-xs leading-3.5 text-body transition-colors outline-none placeholder:text-ghost disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="h-px bg-field-line" />

          {/* Action Buttons */}
          {!isReadOnly && (
            <div className="flex flex-wrap gap-2">
              {!isSigned && (
                <Button variant="outline" onClick={() => setSignModalOpen(true)}>
                  <FileSignature />
                  Sign Disclaimer
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSendQuoteConfirm(true)}
                disabled={sendQuote.isPending}
              >
                <Send />
                Send Quote
              </Button>
              {isSigned && (
                <Button variant="outline" onClick={() => setSignedDocOpen(true)}>
                  <FileCheck />
                  Signed Doc
                </Button>
              )}
            </div>
          )}

          <div className="h-px bg-field-line" />

          {/* Footer: Share Quote + Totals */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Share Quote */}
            <div className="flex flex-col gap-1">
              <span className="font-rubik text-xs leading-3.5 text-label">Share Quote:</span>
              <div className="flex flex-col gap-1 font-rubik text-sm leading-4.5 text-body">
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
              <div className="flex items-center justify-end gap-3 px-3 font-rubik text-base leading-5">
                <span className="text-label">Subtotal:</span>
                <span className="text-body">{formatDollars(subtotal)}</span>
              </div>
              {(quote?.vipDiscountPercent ?? 0) > 0 && (
                <div className="flex items-center justify-end gap-3 px-3 font-rubik text-sm leading-5">
                  <span className="text-label">VIP Discount ({quote!.vipDiscountPercent}%):</span>
                  <span className="text-green">
                    -{formatDollars((subtotal * quote!.vipDiscountPercent) / 100)}
                  </span>
                </div>
              )}
              {(quote?.rewardDiscountPercent ?? 0) > 0 && (
                <div className="flex items-center justify-end gap-3 px-3 font-rubik text-sm leading-5">
                  <span className="text-label">
                    Reward Discount ({quote!.rewardDiscountPercent}%):
                  </span>
                  <span className="text-green">
                    -{formatDollars((subtotal * quote!.rewardDiscountPercent) / 100)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 px-3 font-rubik text-sm leading-5">
                <span className="text-label">Discount:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={discountStr}
                    onChange={(e) => setDiscountStr(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(discountStr, 10);
                      if (!isNaN(val) && val >= 0 && val <= 100 && val !== discountPercent) {
                        if (isAdmin) {
                          updateQuote.mutate({ id: quoteId, discountPercent: val });
                        } else {
                          client.discount
                            .requestQuoteDiscount({ quoteId, requestedPercent: val })
                            .then(() => {
                              toast.success("Discount request sent for admin approval");
                              void queryClient.invalidateQueries({
                                queryKey: orpc.discount.pendingForQuote.key({
                                  input: { quoteId },
                                }),
                              });
                            })
                            .catch((err: Error) => toast.error(err.message));
                          setDiscountStr(String(discountPercent));
                        }
                      } else {
                        setDiscountStr(String(discountPercent));
                      }
                    }}
                    disabled={isReadOnly || !!pendingDiscount}
                    className="w-10 rounded border border-transparent bg-transparent px-1 py-0.5 text-right font-rubik text-sm text-body outline-none hover:border-field-line focus:border-field-line disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-label">%</span>
                  {discountAmount > 0 && (
                    <span className="text-body">(-{formatDollars(discountAmount)})</span>
                  )}
                  {pendingDiscount && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-rubik text-xs text-amber-700">
                      Pending {pendingDiscount.requestedPercent}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 rounded-sm bg-green px-3 py-2 font-rubik text-[22px] leading-6.5 text-white">
                <span>Total:</span>
                <span className="font-medium">{formatDollars(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuoteGeneratorSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingItem(null);
        }}
        onAdd={handleAdd}
        onEdit={handleEditItem}
        editItem={editingItem}
        isAdding={addItem.isPending || updateItem.isPending}
      />

      <Dialog
        open={!!removeConfirm}
        onOpenChange={(open) => {
          if (!open) setRemoveConfirm(null);
        }}
      >
        <DialogContent>
          <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
                <Trash2 className="size-6 text-destructive" />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <DialogTitle>Remove item</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove this item?
                  <br />
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                }
              />
              <Button
                color="destructive"
                className="w-32"
                onClick={() => removeConfirm && removeItem.mutate({ id: removeConfirm })}
                disabled={removeItem.isPending}
              >
                Remove
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
                <Trash2 className="size-6 text-destructive" />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <DialogTitle>Delete quote</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this quote?
                  <br />
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                }
              />
              <Button
                color="destructive"
                className="w-32"
                onClick={() => deleteQuote.mutate({ id: quoteId })}
                disabled={deleteQuote.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign Disclaimer Modal */}
      <SignatureModal
        open={signModalOpen}
        onOpenChange={setSignModalOpen}
        onSign={(dataUrl) => signDisclaimer.mutate({ quoteId, signatureDataUrl: dataUrl })}
      />

      {/* Send Quote Confirmation */}
      <Dialog open={sendQuoteConfirm} onOpenChange={setSendQuoteConfirm}>
        <DialogContent>
          <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-blue/10 bg-blue/20">
                <Send className="size-6 text-blue" />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <DialogTitle>Send Quote to Customer?</DialogTitle>
                <DialogDescription>
                  You are about to send the quote to customer via email, click Send.
                </DialogDescription>
              </div>
            </div>
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
                onClick={() => sendQuote.mutate({ quoteId })}
                disabled={sendQuote.isPending}
              >
                Send Quote
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to Cashier Confirmation */}
      <Dialog open={sendToCashierConfirm} onOpenChange={setSendToCashierConfirm}>
        <DialogContent>
          <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-blue/10 bg-blue/20">
                <SendHorizonal className="size-6 text-blue" />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <DialogTitle>Ready to proceed?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to finalize the quote and send it to the cashier? This will
                  remove the quote from your view and send it directly to the cashier.
                </DialogDescription>
              </div>
            </div>
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
                onClick={() => sendToCashier.mutate({ quoteId })}
                disabled={sendToCashier.isPending}
              >
                Proceed
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signed Doc Modal */}
      <Dialog open={signedDocOpen} onOpenChange={setSignedDocOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Signed Disclaimer</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-3">
            <div className="rounded-md border border-field-line bg-page p-3">
              <p className="font-rubik text-sm leading-5 text-body">
                The customer has reviewed and accepted the service conditions for this quote. By
                signing, they acknowledge the services to be performed and agree to the terms
                outlined.
              </p>
            </div>
            {termsSignatureData && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="font-rubik text-xs leading-3.5 text-label">Signature:</span>
                  <div className="rounded-md border border-field-line bg-white p-2">
                    <img
                      src={termsSignatureData.signatureDataUrl}
                      alt="Customer signature"
                      className="h-[120px] w-full object-contain"
                    />
                  </div>
                </div>
                <div className="font-rubik text-xs text-label">
                  Signed on{" "}
                  {new Date(termsSignatureData.signedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="p-3 pt-0">
            <DialogClose render={<Button variant="ghost">Close</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Services Excluded ────────────────────────────────────────────────────────

function ServicesExcluded({
  services,
  onChanged,
  isReadOnly,
}: {
  services: { id: string; name: string; price: number }[];
  onChanged: () => Promise<void>;
  isReadOnly?: boolean;
}) {
  const promote = useMutation({
    ...orpc.floor.quotes.promoteExcludedService.mutationOptions(),
    onSuccess: async () => {
      await onChanged();
    },
    onError: (err) => toast.error(`Failed to add service: ${err.message}`),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="font-rubik text-sm leading-[18px] text-body">Services Excluded:</span>
        <span className="font-rubik text-xs leading-3.5 text-label">
          The following services were offered as part of our assessment and were declined by the
          client
        </span>
      </div>
      {services.length === 0 ? (
        <p className="font-rubik text-xs text-ghost">No excluded services</p>
      ) : (
        <div className="flex flex-col gap-1">
          {services.map((svc) => (
            <div key={svc.id} className="flex items-center gap-2 rounded-lg bg-page px-2 py-1">
              <div className="flex flex-1 items-baseline gap-2 font-rubik">
                <span className="text-sm leading-[18px] text-body">{svc.name}</span>
                <span className="text-xs leading-3.5 text-label">({formatCents(svc.price)})</span>
              </div>
              {!isReadOnly && (
                <Button
                  variant="outline"
                  onClick={() => promote.mutate({ id: svc.id })}
                  disabled={promote.isPending}
                >
                  <Plus />
                  Add
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── More Dropdown ────────────────────────────────────────────────────────────

function MoreDropdown({
  quoteId,
  customerEmail,
  customerPhone,
  onDelete,
  isDeleting,
  isAdmin,
}: {
  quoteId: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  onDelete: () => void;
  isDeleting: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const send = useMutation({
    ...orpc.floor.quotes.send.mutationOptions(),
    onSuccess: () => toast.success("Quote sent successfully"),
    onError: (err: Error) => toast.error(`Failed to send: ${err.message}`),
  });

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
        className="flex h-9 items-center justify-center gap-2 rounded-md border border-field-line bg-white px-3 font-rubik text-xs leading-3.5 text-body transition-colors hover:bg-page"
      >
        More
        <ChevronDown className="size-4 text-ghost" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-44 overflow-clip rounded-md bg-white pb-1 shadow-[0px_0px_32px_0px_rgba(10,13,18,0.1)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
            }}
            className="flex w-full items-center gap-1.5 px-2 py-2.5 font-rubik text-xs text-body transition-colors hover:bg-page"
          >
            <Printer className="size-4 text-blue" />
            Print
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              toast.info("Proofs feature coming soon");
            }}
            className="flex w-full items-center gap-1.5 px-2 py-2.5 font-rubik text-xs text-body transition-colors hover:bg-page"
          >
            <Images className="size-4 text-blue" />
            Proofs
          </button>
          <button
            type="button"
            disabled={(!customerEmail && !customerPhone) || send.isPending}
            onClick={() => {
              setOpen(false);
              send.mutate({ quoteId });
            }}
            className="flex w-full items-center gap-1.5 px-2 py-2.5 font-rubik text-xs text-body transition-colors hover:bg-page disabled:opacity-50"
          >
            <Send className="size-4 text-blue" />
            Send (Email/SMS)
          </button>
          {isAdmin && (
            <>
              <div className="h-px bg-field-line" />
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-1.5 px-2 py-2.5 font-rubik text-xs text-destructive transition-colors hover:bg-page disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            </>
          )}
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
  onEdit,
  isRemoving,
  isReadOnly,
}: {
  item: {
    id: string;
    description: string | null;
    comments: string | null;
    quantity: number;
    unitCost: number;
    inches: number | null;
  };
  index: number;
  onRemove: () => void;
  onEdit: () => void;
  isRemoving: boolean;
  isReadOnly?: boolean;
}) {
  const rowTotal = item.inches
    ? (item.inches * item.unitCost) / 100
    : (item.quantity * item.unitCost) / 100;

  return (
    <tr className="border-b border-field-line align-top">
      <td className="border-l border-field-line px-2 py-2 text-sm text-body">{index + 1}</td>
      <td className="border-l border-field-line px-2 py-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm leading-[18px] text-body">{item.description ?? "Rim Job"}</span>
          <div className="flex gap-1 text-sm leading-[18px]">
            <span className="text-label">Comments:</span>
            <span className="text-body">{item.comments || " "}</span>
          </div>
        </div>
      </td>
      <td className="border-l border-field-line px-2 py-2 text-sm text-body">
        {item.inches ? `${item.inches}"` : item.quantity}
      </td>
      <td className="border-l border-field-line px-2 py-2 text-sm text-body">
        {formatCents(item.unitCost)}
      </td>
      <td className="border-l border-field-line px-2 py-2 text-sm text-body">
        {formatDollars(rowTotal)}
      </td>
      <td className="border-r border-l border-field-line px-2 py-2">
        {!isReadOnly && (
          <div className="flex flex-col items-center gap-1">
            <Button className="w-full" variant="outline" onClick={onEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              className="w-full"
              variant="outline"
              color="destructive"
              onClick={onRemove}
              disabled={isRemoving}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
