import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Header ───────────────────────────────────────────────────────────────────

export function DialogHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-field-line py-3 pr-2 pl-3">
      <p className="font-rubik text-[16px] leading-[20px] font-medium text-[#1a1f1a]">{title}</p>
      <Dialog.Close className="flex items-center rounded-[6px] p-1 text-label transition-colors hover:text-body">
        <X className="size-4" />
      </Dialog.Close>
    </div>
  );
}

// ─── Customer row ─────────────────────────────────────────────────────────────

export function DialogCustomerRow({ customer, jobId }: { customer: string; jobId: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-field-line pt-3 pb-2 font-rubik text-[14px] leading-[18px]">
      <span className="font-medium text-body">{customer}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-label">Job ID:</span>
        <span className="text-body">{jobId}</span>
      </div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

export function DialogModal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
      <Dialog.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-full max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]",
          className,
        )}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
