import { useState } from "react";

import { FilePenLine } from "lucide-react";

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

import { DISCLAIMER_PARAGRAPHS, DISCLAIMER_TITLE } from "./disclaimer";

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (signatureDataUrl: string) => void;
}

export function SignatureModal({ open, onOpenChange, onSign }: SignatureModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <SignatureModalBody onSign={onSign} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function SignatureModalBody({ onOpenChange, onSign }: Omit<SignatureModalProps, "open">) {
  const [signature, setSignature] = useState<string | null>(null);

  function handleSign() {
    if (!signature) return;
    onSign(signature);
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Signature</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-3 py-3">
        <Banner icon={<FilePenLine />}>
          Sign below to confirm acceptance of the service conditions
        </Banner>

        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          {/* Disclaimer — shown to the left of the signature widget (RIM-3) */}
          <div className="flex flex-1 flex-col gap-1">
            <span className="font-rubik text-sm leading-4.5 text-body">{DISCLAIMER_TITLE}</span>
            <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto rounded-md border border-field-line bg-page p-3">
              {DISCLAIMER_PARAGRAPHS.map((paragraph, i) => (
                <p key={i} className="font-rubik text-sm leading-5 text-body">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <span className="font-rubik text-sm leading-4.5 text-body">
              Signature inside the field:
            </span>
            <SignaturePadField className="h-70" onChange={setSignature} />
          </div>
        </div>

        <DialogFooter className="p-0">
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button color="success" className="w-32" disabled={!signature} onClick={handleSign}>
            Sign
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
