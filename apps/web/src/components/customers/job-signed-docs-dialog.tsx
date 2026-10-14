import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SignedDisclaimerNotice } from "@/components/terms/signed-disclaimer-notice";
import { orpc } from "@/utils/orpc";

export interface SignedDocsJob {
  invoiceId: string;
  quoteId: string;
  isPickedUp: boolean;
}

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-rubik text-sm leading-4.5 font-medium text-body">{title}</h3>
      {children}
    </section>
  );
}

function SignatureImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-rubik text-xs leading-3.5 text-label">Signature:</span>
      <div className="rounded-md border border-field-line bg-white p-2">
        <img src={src} alt={alt} className="h-[120px] w-full object-contain" />
      </div>
    </div>
  );
}

function SignatureSkeleton() {
  return <Skeleton className="h-[138px] rounded-md" />;
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-2 text-center font-rubik text-sm text-label">{children}</p>;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="font-rubik text-xs leading-3.5">
      <span className="text-label">{label}: </span>
      <span className="text-body">{value}</span>
    </p>
  );
}

function DisclaimerProof({ quoteId }: { quoteId: string }) {
  const { data, isLoading } = useQuery(
    orpc.floor.termsSignature.getByQuoteId.queryOptions({ input: { quoteId } }),
  );

  return (
    <Section title="Service Disclaimer">
      <SignedDisclaimerNotice />
      {isLoading ? (
        <SignatureSkeleton />
      ) : data ? (
        <>
          <SignatureImage src={data.signatureDataUrl} alt="Customer disclaimer signature" />
          <MetaRow label="Signed on" value={formatDateTime(data.signedAt)} />
        </>
      ) : (
        <EmptyNote>No disclaimer has been signed for this quote yet.</EmptyNote>
      )}
    </Section>
  );
}

function PickupProof({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading } = useQuery(
    orpc.inventory.pickups.getByInvoiceId.queryOptions({ input: { invoiceId } }),
  );

  return (
    <Section title="Pickup">
      {isLoading ? (
        <SignatureSkeleton />
      ) : data ? (
        <>
          <SignatureImage src={data.signatureUrl} alt="Customer pickup signature" />
          <MetaRow label="Picked up on" value={formatDateTime(data.pickedUpAt)} />
          <MetaRow label="Released by" value={data.pickedUpBy.name} />
          {data.notes && <MetaRow label="Notes" value={data.notes} />}
        </>
      ) : (
        <EmptyNote>No signature (picked up before signatures were required).</EmptyNote>
      )}
    </Section>
  );
}

export function JobSignedDocsDialog({
  job,
  onClose,
}: {
  job: SignedDocsJob | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!job}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Signed Documents</DialogTitle>
        </DialogHeader>
        {job && (
          <div className="flex flex-col gap-4 p-3">
            <DisclaimerProof quoteId={job.quoteId} />
            <div className="h-px bg-field-line" />
            {job.isPickedUp ? (
              <PickupProof invoiceId={job.invoiceId} />
            ) : (
              <Section title="Pickup">
                <EmptyNote>Not picked up yet.</EmptyNote>
              </Section>
            )}
          </div>
        )}
        <DialogFooter className="p-3 pt-0">
          <DialogClose render={<Button variant="ghost">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
