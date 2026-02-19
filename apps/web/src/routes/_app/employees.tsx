import { useState } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { UserRole } from "@rim-genie/db/schema";
import { userRoleEnum } from "@rim-genie/db/schema";

import { ResetPinModal } from "@/components/auth/reset-pin-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectPopup, SelectOption } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/employees")({
  beforeLoad: ({ context }) => {
    if (context.session.user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: EmployeesPage,
});

const ROLE_LABELS: Record<UserRole, () => string> = {
  admin: m.employees_role_admin,
  floorManager: m.employees_role_floorManager,
  cashier: m.employees_role_cashier,
  technician: m.employees_role_technician,
  inventoryClerk: m.employees_role_inventoryClerk,
};

function IconEdit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M9.333 4L12 6.667M2 14l.521-3.127a2.667 2.667 0 0 1 .738-1.434l7.052-7.052a1.32 1.32 0 0 1 1.868 0l1.434 1.434a1.32 1.32 0 0 1 0 1.868L6.561 12.74a2.667 2.667 0 0 1-1.434.738L2 14Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconResetPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M14.333 8a6.333 6.333 0 1 1-5.527-6.333A6.333 6.333 0 0 1 13.806 5.467M14.333 3.667l-.316 2.116L12 5.333M6.667 7.333v-1a1.333 1.333 0 1 1 2.666 0v1M7.5 11h1c.782 0 1.173 0 1.442-.207a1 1 0 0 0 .185-.185c.206-.27.206-.66.206-1.441 0-.782 0-1.173-.206-1.442a1 1 0 0 0-.185-.185C9.673 7.333 9.282 7.333 8.5 7.333h-1c-.782 0-1.173 0-1.442.207a1 1 0 0 0-.185.185c-.206.27-.206.66-.206 1.442 0 .782 0 1.172.206 1.441a1 1 0 0 0 .185.185C6.327 11 6.718 11 7.5 11Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex items-center justify-center rounded bg-badge-blue px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white">
      {ROLE_LABELS[role]()}
    </span>
  );
}

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

type Employee = { id: string; name: string; email: string; role: UserRole | null };

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function EmployeeModal({ trigger, employee }: { trigger: React.ReactNode; employee?: Employee }) {
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
  });

  const updateEmployee = useMutation({
    ...orpc.employees.update.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.employees.key() });
      toast.success(m.employees_toast_updated());
      setOpen(false);
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
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) form.reset();
      }}
    >
      <Dialog.Trigger render={<span />}>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#fafbfc] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-field-line py-3 pr-2 pl-3">
            <p className="font-rubik text-base leading-5 font-medium text-body">
              {isEdit ? m.employees_modal_edit_title() : m.employees_modal_create_title()}
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

            <div className="flex items-center justify-center gap-2">
              <Dialog.Close
                render={
                  <Button variant="ghost" type="button" onClick={() => form.reset()}>
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

function EmployeeCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4.5 w-32 rounded" />
          <Skeleton className="h-4.5 w-20 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-36 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-18 rounded-lg" />
        <Skeleton className="h-9 w-26 rounded-lg" />
      </div>
    </div>
  );
}

function EmployeesPage() {
  const { data: employees, isLoading } = useQuery(orpc.employees.list.queryOptions({}));

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
          {m.employees_title()}
        </h1>
        <EmployeeModal
          trigger={
            <Button>
              <Plus className="size-4" />
              {m.employees_btn_add()}
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <EmployeeCardSkeleton key={i} />)}

        {!isLoading && employees?.length === 0 && (
          <p className="py-8 text-center font-rubik text-sm text-label">{m.employees_empty()}</p>
        )}

        {employees?.map((employee) => (
          <div
            key={employee.id}
            className="flex items-center justify-between rounded-xl border border-card-line bg-white p-3 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <span className="font-rubik text-sm leading-[18px] font-medium text-body">
                  {employee.name}
                </span>
                {employee.role && <RoleBadge role={employee.role} />}
              </div>
              <div className="flex items-center gap-2 font-rubik text-xs leading-3.5">
                <span className="text-label">{m.employees_label_user_id()}</span>
                <span className="text-body">{employee.id.slice(0, 8)}</span>
                <span className="size-1 rounded-full bg-label" />
                <span className="text-label">{m.employees_label_email()}</span>
                <span className="text-body">{employee.email}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <EmployeeModal
                employee={employee}
                trigger={
                  <button
                    type="button"
                    className="flex h-9 w-18 items-center justify-center gap-1.5 rounded-lg border border-blue p-2"
                  >
                    <IconEdit className="size-4 shrink-0 text-blue" />
                    <span className="font-rubik text-xs leading-3.5 text-blue">
                      {m.employees_btn_edit()}
                    </span>
                  </button>
                }
              />
              <ResetPinModal
                employeeId={employee.id}
                trigger={
                  <button
                    type="button"
                    className="flex h-9 w-26 items-center justify-center gap-1.5 rounded-lg border border-red p-2"
                  >
                    <IconResetPin className="size-4 shrink-0 text-red" />
                    <span className="font-rubik text-xs leading-3.5 text-red">
                      {m.employees_btn_reset_pin()}
                    </span>
                  </button>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
