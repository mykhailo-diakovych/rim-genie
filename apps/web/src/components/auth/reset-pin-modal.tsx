import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";
import type { DialogTriggerProps } from "@base-ui/react";

const pinField = z
  .string()
  .length(4, m.validation_pin_six_digits())
  .regex(/^\d+$/, m.validation_pin_six_digits());

interface ResetPinModalProps {
  employeeId: string;
  trigger: DialogTriggerProps["render"];
}

export function ResetPinModal({ employeeId, trigger }: ResetPinModalProps) {
  const [open, setOpen] = useState(false);

  const resetPin = useMutation(orpc.employees.resetPin.mutationOptions());

  const form = useForm({
    defaultValues: { newPin: "", confirmPin: "" },
    onSubmit: async ({ value }) => {
      try {
        await resetPin.mutateAsync({
          userId: employeeId,
          newPin: value.newPin,
        });
        toast.success(m.employees_toast_pin_reset());
        form.reset();
        setOpen(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) form.reset();
      }}
    >
      <DialogTrigger render={trigger} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.reset_pin_title()}</DialogTitle>
        </DialogHeader>

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
                  <Label>{m.label_new_pin()}</Label>
                  <PinInput
                    value={field.state.value}
                    onChange={field.handleChange}
                    error={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="font-rubik text-xs text-red">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="confirmPin">
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label>{m.label_confirm_pin()}</Label>
                  <PinInput
                    value={field.state.value}
                    onChange={field.handleChange}
                    error={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="font-rubik text-xs text-red">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter className="p-0">
            <DialogClose render={<Button variant="ghost" />}>{m.btn_cancel()}</DialogClose>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
