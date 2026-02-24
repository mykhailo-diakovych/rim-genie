import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import type { DialogTriggerProps } from "@base-ui/react";
import type { UserRole } from "@rim-genie/db/schema";
import { userRoleEnum } from "@rim-genie/db/schema";

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
import { Select, SelectOption, SelectPopup, SelectTrigger } from "@/components/ui/select";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

import type { EmployeeCardData } from "./employee-card";
import { ROLE_LABELS } from "./role-badge";

const ROLE_OPTIONS = userRoleEnum.enumValues.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

const baseFieldsSchema = z.object({
  firstName: z.string().min(1, m.employees_validation_first_name_required()),
  lastName: z.string().min(1, m.employees_validation_last_name_required()),
  email: z
    .string()
    .min(1, m.employees_validation_email_required())
    .email(m.employees_validation_email_invalid()),
  role: z.enum(userRoleEnum.enumValues, { message: m.employees_validation_role_required() }),
});

const createEmployeeSchema = baseFieldsSchema.extend({
  pin: z
    .string()
    .length(6, m.validation_pin_six_digits())
    .regex(/^\d+$/, m.validation_pin_six_digits()),
});

const editEmployeeSchema = baseFieldsSchema;

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

interface EmployeeModalProps {
  trigger: DialogTriggerProps["render"];
  employee?: EmployeeCardData;
}

export function EmployeeModal({ trigger, employee }: EmployeeModalProps) {
  const isEdit = !!employee;
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createEmployee = useMutation({
    ...orpc.employees.create.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.employees.key() });
      toast.success(m.employees_toast_created());
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateEmployee = useMutation({
    ...orpc.employees.update.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.employees.key() });
      toast.success(m.employees_toast_updated());
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const initial = employee
    ? {
        ...splitName(employee.name),
        email: employee.email,
        role: employee.role ?? ("" as string),
        pin: "",
      }
    : { firstName: "", lastName: "", email: "", role: "" as string, pin: "" };

  const form = useForm({
    defaultValues: initial,
    onSubmit: ({ value }) => {
      if (isEdit) {
        updateEmployee.mutate({
          id: employee.id,
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          role: value.role as UserRole,
        });
      } else {
        createEmployee.mutate(value as z.infer<typeof createEmployeeSchema>);
      }
    },
    validators: {
      onSubmit: isEdit
        ? (editEmployeeSchema as unknown as typeof createEmployeeSchema)
        : createEmployeeSchema,
    },
  });

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          form.reset();
          createEmployee.reset();
          updateEmployee.reset();
        }
      }}
    >
      <DialogTrigger render={trigger} />

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.employees_modal_edit_title() : m.employees_modal_create_title()}
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
                    <Label htmlFor={field.name}>{m.employees_label_first_name()}</Label>
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
                    <Label htmlFor={field.name}>{m.employees_label_last_name()}</Label>
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

              <form.Field name="role">
                {(field) => (
                  <div className="flex flex-1 flex-col gap-1">
                    <Label>{m.employees_label_role()}</Label>
                    <Select
                      value={field.state.value || null}
                      onValueChange={(val) => field.handleChange(val as string)}
                    >
                      <SelectTrigger
                        className={field.state.meta.errors.length > 0 ? "border-red/50" : ""}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {field.state.value ? (
                            <span className="text-body">
                              {ROLE_LABELS[field.state.value as UserRole]()}
                            </span>
                          ) : (
                            <span className="text-ghost">{m.employees_role_placeholder()}</span>
                          )}
                        </span>
                      </SelectTrigger>
                      <SelectPopup>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectOption key={opt.value} value={opt.value}>
                            {opt.label()}
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

            {!isEdit && (
              <form.Field name="pin">
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={field.name}>{m.employees_label_pin()}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
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
            )}
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
