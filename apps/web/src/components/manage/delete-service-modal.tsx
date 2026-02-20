import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { IconDelete } from "./service-table";

interface DeleteServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function DeleteServiceModal({
  open,
  onOpenChange,
  serviceName,
  onConfirm,
  isPending,
}: DeleteServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-8 border-destructive/10 bg-destructive/15">
              <IconDelete className="size-6 text-destructive" />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <DialogTitle>{m.manage_modal_delete_title()}</DialogTitle>
              <DialogDescription>
                {m.manage_modal_delete_confirm_before()}{" "}
                <span className="font-medium text-body">{serviceName}</span>{" "}
                {m.manage_modal_delete_confirm_after()}
                <br />
                {m.manage_modal_delete_undone()}
              </DialogDescription>
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
            <Button color="destructive" className="w-32" onClick={onConfirm} disabled={isPending}>
              {m.manage_btn_delete()}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
