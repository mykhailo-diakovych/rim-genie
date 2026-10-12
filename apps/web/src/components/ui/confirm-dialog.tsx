import { CircleHelp, Loader2, TriangleAlert } from "lucide-react";
import type * as React from "react";

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
import { m } from "@/paraglide/messages";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: () => void;
  isPending?: boolean;
  destructive?: boolean;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = m.btn_cancel(),
  onConfirm,
  isPending = false,
  destructive = false,
}: ConfirmDialogProps) {
  const Icon = destructive ? TriangleAlert : CircleHelp;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!isPending}>
        <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full border-8",
                destructive ? "border-error-50 bg-error-100" : "border-blue/5 bg-blue/10",
              )}
            >
              <Icon className={cn("size-6", destructive ? "text-destructive" : "text-blue")} />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={isPending}
              render={
                <Button variant="ghost" type="button">
                  {cancelLabel}
                </Button>
              }
            />
            <Button
              type="button"
              color={destructive ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
