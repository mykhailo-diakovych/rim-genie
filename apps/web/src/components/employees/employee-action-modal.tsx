import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

interface EmployeeActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function EmployeeActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
}: EmployeeActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
              <TriangleAlert className="size-6 text-destructive" />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button variant="ghost" type="button">
                  {m.btn_cancel()}
                </Button>
              }
            />
            <Button color="destructive" onClick={onConfirm} disabled={isPending}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
