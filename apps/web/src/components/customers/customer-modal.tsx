import { useState } from "react";

import { Checkbox } from "@base-ui/react/checkbox";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectOption,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";
import type { DialogTriggerProps } from "@base-ui/react";

const customerSchema = z.object({
  firstName: z.string().min(1, m.customers_validation_first_name_required()),
  lastName: z.string().min(1, m.customers_validation_last_name_required()),
  phone: z.string().min(1, m.customers_validation_phone_required()),
  email: z.union([z.string().email(m.customers_validation_email_invalid()), z.literal("")]),
  birthdayDay: z.string(),
  birthdayMonth: z.string(),
  discount: z.string(),
  isVip: z.boolean(),
});

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

const PHONE_PREFIX = "+1 876 ";

function stripPhonePrefix(phone: string): string {
  return phone.startsWith(PHONE_PREFIX) ? phone.slice(PHONE_PREFIX.length) : phone;
}

function addPhonePrefix(phone: string): string {
  return phone.startsWith("+") ? phone : `${PHONE_PREFIX}${phone}`;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthdayDay: number | null;
  birthdayMonth: number | null;
  isVip: boolean;
  discount: number | null;
}

interface CustomerModalProps {
  trigger: DialogTriggerProps["render"];
  customer?: CustomerData;
}

export function CustomerModal({ trigger, customer }: CustomerModalProps) {
  const isEdit = !!customer;
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createCustomer = useMutation({
    ...orpc.floor.customers.create.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.key() });
      toast.success(m.customers_toast_created());
      setOpen(false);
    },
  });

  const updateCustomer = useMutation({
    ...orpc.floor.customers.update.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.key() });
      toast.success(m.customers_toast_updated());
      setOpen(false);
    },
  });

  const initial = customer
    ? {
        ...splitName(customer.name),
        phone: stripPhonePrefix(customer.phone),
        email: customer.email ?? "",
        birthdayDay: customer.birthdayDay?.toString() ?? "",
        birthdayMonth: customer.birthdayMonth?.toString() ?? "",
        discount: customer.discount?.toString() ?? "",
        isVip: customer.isVip,
      }
    : {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        birthdayDay: "",
        birthdayMonth: "",
        discount: "",
        isVip: false,
      };

  const form = useForm({
    defaultValues: initial,
    onSubmit: ({ value }) => {
      const name = [value.firstName.trim(), value.lastName.trim()].filter(Boolean).join(" ");
      const phone = addPhonePrefix(value.phone.trim());
      const emailValue = value.email || undefined;
      const birthdayDay = value.birthdayDay ? parseInt(value.birthdayDay) : undefined;
      const birthdayMonth = value.birthdayMonth ? parseInt(value.birthdayMonth) : undefined;
      const discount = value.discount !== "" ? parseInt(value.discount) : undefined;

      if (isEdit) {
        updateCustomer.mutate({
          id: customer.id,
          name,
          phone,
          email: emailValue,
          birthdayDay,
          birthdayMonth,
          isVip: value.isVip,
          discount,
        });
      } else {
        createCustomer.mutate({
          name,
          phone,
          email: emailValue,
          birthdayDay,
          birthdayMonth,
          isVip: value.isVip,
          discount,
        });
      }
    },
    validators: { onSubmit: customerSchema },
  });

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) form.reset();
      }}
    >
      <DialogTrigger render={trigger} />

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.customers_modal_edit_title() : m.customers_modal_create_title()}
          </DialogTitle>
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
            <div className="flex gap-3">
              <form.Field name="firstName">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor={field.name}>{m.customers_label_first_name()}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="font-rubik text-xs text-red">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="lastName">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor={field.name}>{m.customers_label_last_name()}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
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

            <div className="flex gap-3">
              <form.Field name="email">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor={field.name}>{m.label_email()}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      error={field.state.meta.errors.length > 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="font-rubik text-xs text-red">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label>{m.customers_label_mobile_phone()}</Label>
                    <div
                      className={cn(
                        "flex h-9 w-full items-center overflow-hidden rounded-md border bg-white transition-colors",
                        field.state.meta.errors.length > 0 ? "border-red/50" : "border-field-line",
                      )}
                    >
                      <div className="flex h-full shrink-0 items-center border-r border-field-line px-2">
                        <span className="font-rubik text-[12px] leading-[14px] text-body">
                          +1 876
                        </span>
                      </div>
                      <input
                        name={field.name}
                        value={field.state.value}
                        placeholder={m.customers_placeholder_phone()}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-2 font-rubik text-xs leading-3.5 text-body outline-none placeholder:text-ghost"
                      />
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="font-rubik text-xs text-red">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="flex w-[222px] gap-3">
              <form.Field name="birthdayDay">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label>{m.customers_label_birthday_day()}</Label>
                    <Select
                      value={field.state.value || null}
                      onValueChange={(val) => field.handleChange(val as string)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectPopup>
                        {DAY_OPTIONS.map((d) => (
                          <SelectOption key={d} value={d}>
                            {d}
                          </SelectOption>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                )}
              </form.Field>

              <form.Field name="birthdayMonth">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label>{m.customers_label_birthday_month()}</Label>
                    <Select
                      value={field.state.value || null}
                      onValueChange={(val) => field.handleChange(val as string)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectPopup>
                        {MONTH_OPTIONS.map((mo) => (
                          <SelectOption key={mo} value={mo}>
                            {mo}
                          </SelectOption>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="h-px bg-field-line" />

            <form.Field name="discount">
              {(field) => (
                <div className="flex w-[105px] flex-col gap-1">
                  <Label htmlFor={field.name}>{m.customers_label_discount()}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="isVip">
              {(field) => (
                <div className="flex h-9 items-center">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <Checkbox.Root
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked === true)}
                      className="relative flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-field-line bg-white transition-colors data-checked:border-blue data-checked:bg-blue"
                    >
                      <Checkbox.Indicator className="flex items-center justify-center text-white">
                        <Check className="size-3" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span className="font-rubik text-sm leading-4.5 text-body">
                      {m.customers_label_vip()}
                    </span>
                  </label>
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter className="p-0">
            <DialogClose
              render={
                <Button variant="ghost" onClick={() => form.reset()}>
                  {m.btn_cancel()}
                </Button>
              }
            />
            <form.Subscribe>
              {(state) => (
                <Button
                  color="success"
                  className="w-32"
                  type="submit"
                  disabled={!state.canSubmit || state.isSubmitting || isPending}
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
