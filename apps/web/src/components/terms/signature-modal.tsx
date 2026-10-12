import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

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

import { DISCLAIMER_PARAGRAPHS, DISCLAIMER_TITLE } from "./disclaimer";

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (signatureDataUrl: string) => void;
}

export function SignatureModal({ open, onOpenChange, onSign }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!open) {
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
      setIsEmpty(true);
      return;
    }

    let rafId: number;

    rafId = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ratio = window.devicePixelRatio ?? 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);

      const pad = new SignaturePad(canvas);
      signaturePadRef.current = pad;

      pad.addEventListener("endStroke", () => {
        setIsEmpty(pad.isEmpty());
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      signaturePadRef.current?.off();
    };
  }, [open]);

  function handleSign() {
    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty()) return;
    onSign(pad.toDataURL());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
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
              <label className="font-rubik text-sm leading-4.5 text-body">
                Signature inside the field:
              </label>
              <canvas
                ref={canvasRef}
                className="h-[280px] w-full rounded-md border border-field-line bg-white"
              />
            </div>
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button color="success" className="w-32" disabled={isEmpty} onClick={handleSign}>
              Sign
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
