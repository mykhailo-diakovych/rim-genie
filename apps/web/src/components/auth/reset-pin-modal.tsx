import { useRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

const pinField = z
  .string()
  .length(6, m.validation_pin_six_digits())
  .regex(/^\d+$/, m.validation_pin_six_digits());

interface ResetPinModalProps {
  employeeId: string;
  trigger: React.ReactNode;
}

export function ResetPinModal({ employeeId, trigger }: ResetPinModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const resetPin = useMutation(orpc.employees.resetPin.mutationOptions());

  const form = useForm({
    defaultValues: { newPin: "", confirmPin: "" },
    onSubmit: async ({ value }) => {
      await resetPin.mutateAsync({ userId: employeeId, newPin: value.newPin });
      toast.success(m.employees_toast_pin_reset());
      closeRef.current?.click();
    },
    validators: {
      onSubmit: z
        .object({
          newPin: pinField,
          confirmPin: z.string(),
        })
        .refine((v) => v.newPin === v.confirmPin, {
          message: m.validation_pins_mismatch(),
          path: ["confirmPin"],
        }),
    },
  });

  return (
    <Dialog.Root onOpenChange={(open) => !open && form.reset()}>
      <Dialog.Trigger render={<span />}>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-field-line py-3 pr-2 pl-3">
            <p className="font-rubik text-[16px] leading-[20px] font-medium text-body">
              {m.reset_pin_title()}
            </p>
            <Dialog.Close className="flex items-center rounded-[6px] p-1 text-label transition-colors hover:text-body">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex flex-col gap-6 p-3"
          >
            <div className="flex flex-col gap-3">
              <form.Field name="newPin">
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={field.name}>{m.label_new_pin()}</Label>
                    <Input
                      id={field.name}
                      type="password"
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="font-rubik text-[12px] text-red">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="confirmPin">
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={field.name}>{m.label_confirm_pin()}</Label>
                    <Input
                      id={field.name}
                      type="password"
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="font-rubik text-[12px] text-red">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Dialog.Close ref={closeRef} render={<Button variant="ghost" />}>
                {m.btn_cancel()}
              </Dialog.Close>
              <form.Subscribe>
                {(state) => (
                  <Button
                    type="submit"
                    color="success"
                    className="w-32"
                    disabled={!state.canSubmit || state.isSubmitting || resetPin.isPending}
                  >
                    {m.btn_save()}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
