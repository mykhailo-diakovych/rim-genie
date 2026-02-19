import { useEffect } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { ServiceType } from "@rim-genie/db/schema";
import { vehicleTypeEnum } from "@rim-genie/db/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

import type { ServiceRow } from "./service-table";

const SIZE_OPTIONS = ["10", "11", "12", "13", "14", "15", "16", "16.5", "17", "18", "19", "19.5", "20", "21", "22", "23", "24", "26"];

const VEHICLE_TYPE_LABELS: Record<string, () => string> = {
  car: m.manage_vehicle_type_car,
  suv: m.manage_vehicle_type_suv,
  truck: m.manage_vehicle_type_truck,
  van: m.manage_vehicle_type_van,
};

const makeSchema = (serviceType: ServiceType) =>
  z.object({
    vehicleType: z
      .string()
      .refine((v) => serviceType !== "general" || v.length > 0, {
        message: m.manage_validation_vehicle_type_required(),
      }),
    name: z.string().min(1, m.manage_validation_name_required()),
    minSize: z.string().min(1, m.manage_validation_min_size_invalid()),
    maxSize: z.string().min(1, m.manage_validation_max_size_invalid()),
    unitCostDollars: z
      .string()
      .min(1)
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
        message: m.manage_validation_unit_cost_invalid(),
      }),
  });

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType: ServiceType;
  service?: ServiceRow;
}

export function ServiceModal({ open, onOpenChange, serviceType, service }: ServiceModalProps) {
  const isEdit = !!service;
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.manage.services.list.key() });

  const create = useMutation({
    ...orpc.manage.services.create.mutationOptions(),
    onSuccess: async () => {
      await invalidate();
      toast.success(m.manage_toast_created());
      onOpenChange(false);
    },
  });

  const update = useMutation({
    ...orpc.manage.services.update.mutationOptions(),
    onSuccess: async () => {
      await invalidate();
      toast.success(m.manage_toast_updated());
      onOpenChange(false);
    },
  });

  const makeInitial = () =>
    service
      ? {
          vehicleType: service.vehicleType ?? "",
          name: service.name,
          minSize: String(Math.round(parseFloat(service.minSize))),
          maxSize: String(Math.round(parseFloat(service.maxSize))),
          unitCostDollars: (service.unitCost / 100).toString(),
        }
      : { vehicleType: "", name: "", minSize: "", maxSize: "", unitCostDollars: "" };

  const form = useForm({
    defaultValues: makeInitial(),
    onSubmit: ({ value }) => {
      const unitCost = Math.round(Number(value.unitCostDollars) * 100);
      const payload = {
        type: serviceType,
        name: value.name,
        vehicleType: value.vehicleType
          ? (value.vehicleType as (typeof vehicleTypeEnum.enumValues)[number])
          : null,
        minSize: Number(value.minSize),
        maxSize: Number(value.maxSize),
        unitCost,
      };
      if (isEdit) {
        update.mutate({ id: service.id, ...payload });
      } else {
        create.mutate(payload);
      }
    },
    validators: { onSubmit: makeSchema(serviceType) },
  });

  useEffect(() => {
    if (!open) form.reset(makeInitial());
  }, [open]);

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-field-line py-3 pr-2 pl-3">
            <p className="font-rubik text-base leading-5 font-medium text-body">
              {isEdit ? m.manage_modal_edit_title() : m.manage_modal_create_title()}
            </p>
            <Dialog.Close className="flex items-center rounded-md p-1 text-label transition-colors hover:text-body">
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
              {serviceType === "general" && (
                <form.Field name="vehicleType">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <Label>{m.manage_label_vehicle_type()}</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectPopup>
                          {vehicleTypeEnum.enumValues.map((vt) => (
                            <SelectOption key={vt} value={vt}>
                              {VEHICLE_TYPE_LABELS[vt]?.()}
                            </SelectOption>
                          ))}
                        </SelectPopup>
                      </Select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              )}

              <form.Field name="name">
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={field.name}>{m.manage_label_name()}</Label>
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

              <div className="flex gap-3 w-[222px]">
                <form.Field name="minSize">
                  {(field) => (
                    <div className="flex flex-1 flex-col gap-1">
                      <Label>{m.manage_label_min_size()}</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectPopup>
                          {SIZE_OPTIONS.map((size) => (
                            <SelectOption key={size} value={size}>
                              {size} inches
                            </SelectOption>
                          ))}
                        </SelectPopup>
                      </Select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="maxSize">
                  {(field) => (
                    <div className="flex flex-1 flex-col gap-1">
                      <Label>{m.manage_label_max_size()}</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectPopup>
                          {SIZE_OPTIONS.map((size) => (
                            <SelectOption key={size} value={size}>
                              {size} inches
                            </SelectOption>
                          ))}
                        </SelectPopup>
                      </Select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="font-rubik text-xs text-red">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="unitCostDollars">
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={field.name}>{m.manage_label_unit_cost()}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
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

            <div className="flex items-center justify-center gap-2">
              <Dialog.Close
                render={
                  <Button variant="ghost" type="button">
                    {m.btn_cancel()}
                  </Button>
                }
              />
              <form.Subscribe>
                {(state) => (
                  <Button
                    variant="success"
                    className="w-32"
                    type="submit"
                    disabled={!state.canSubmit || state.isSubmitting || isPending}
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
