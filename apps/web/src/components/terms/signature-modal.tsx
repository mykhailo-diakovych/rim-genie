import { useEffect, useRef, useState } from "react";

import { Info } from "lucide-react";
import SignaturePad from "signature_pad";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Signature</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 bg-[#e2f1fe] px-3 py-2">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#c9e0f3]">
            <Info className="size-6 text-blue" />
          </div>
          <p className="font-rubik text-sm leading-4.5 text-body">
            Sign below to confirm acceptance of the service conditions
          </p>
        </div>

        <div className="flex flex-col gap-6 px-3 py-3">
          <div className="flex flex-col gap-1">
            <label className="font-rubik text-xs leading-3.5 text-label">
              Signature inside the field:
            </label>
            <canvas
              ref={canvasRef}
              className="h-[200px] w-full rounded-md border border-field-line bg-white"
            />
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
