import { useEffect, useEffectEvent, useRef, useState } from "react";
import SignaturePad from "signature_pad";

import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignaturePadFieldProps {
  onChange: (dataUrl: string | null) => void;
  className?: string;
}

export function SignaturePadField({ onChange, className }: SignaturePadFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const emitChange = useEffectEvent((pad: SignaturePad) => {
    const empty = pad.isEmpty();
    setIsEmpty(empty);
    onChange(empty ? null : pad.toDataURL());
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas);
    padRef.current = pad;

    const handleEndStroke = () => emitChange(pad);
    pad.addEventListener("endStroke", handleEndStroke);

    // Resizing the canvas bitmap wipes it, so redraw the stored strokes at the new size.
    const observer = new ResizeObserver(() => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.redraw();
      if (!pad.isEmpty()) emitChange(pad);
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      pad.removeEventListener("endStroke", handleEndStroke);
      pad.off();
      padRef.current = null;
    };
  }, []);

  function handleClear() {
    padRef.current?.clear();
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div className={cn("relative", className)}>
      <canvas ref={canvasRef} className="size-full rounded-md border border-field-line bg-white" />
      {isEmpty && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-rubik text-sm text-ghost select-none">
          Sign inside the box
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        disabled={isEmpty}
        onClick={handleClear}
      >
        <Eraser />
        Clear
      </Button>
    </div>
  );
}
