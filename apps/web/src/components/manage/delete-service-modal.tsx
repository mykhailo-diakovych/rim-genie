import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]">
          <Dialog.Close className="absolute top-3 right-3 flex items-center rounded-md p-1 text-label transition-colors hover:text-body">
            <X className="size-4" />
          </Dialog.Close>

          <div className="flex flex-col items-center gap-6 px-3 pt-4 pb-3">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[28px] border-8 border-[#fef3f2] bg-[#fee4e2]">
                <IconDelete className="size-6 text-destructive" />
              </div>

              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-rubik text-base leading-5 font-medium text-body">
                  {m.manage_modal_delete_title()}
                </p>
                <p className="font-rubik text-sm leading-[18px] text-label">
                  {m.manage_modal_delete_confirm_before()}{" "}
                  <span className="font-medium text-body">{serviceName}</span>{" "}
                  {m.manage_modal_delete_confirm_after()}
                  <br />
                  {m.manage_modal_delete_undone()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Dialog.Close
                render={
                  <Button variant="ghost" type="button">
                    {m.btn_cancel()}
                  </Button>
                }
              />
              <Button
                color="destructive"
                className="w-32"
                onClick={onConfirm}
                disabled={isPending}
              >
                {m.manage_btn_delete()}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
