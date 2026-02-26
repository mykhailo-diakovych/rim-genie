import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ResetPinModal } from "@/components/auth/reset-pin-modal";
import { EmployeeActionModal } from "@/components/employees/employee-action-modal";
import {
  EmployeeCard,
  type EmployeeCardData,
  EmployeeCardSkeleton,
  IconEdit,
  IconResetPin,
} from "@/components/employees/employee-card";
import { EmployeeModal } from "@/components/employees/employee-modal";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/route-permissions";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/employees")({
  beforeLoad: requireRoles(["admin"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Employees" }],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { data: employees, isLoading } = useQuery(orpc.employees.list.queryOptions({}));

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
          {m.employees_title()}
        </h1>
        <EmployeeModal
          trigger={
            <Button>
              <Plus />
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
          <EmployeeCard
            key={employee.id}
            employee={employee}
            actions={<EmployeeActions employee={employee} />}
          />
        ))}
      </div>
    </div>
  );
}

function EmployeeActions({ employee }: { employee: EmployeeCardData }) {
  const queryClient = useQueryClient();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: orpc.employees.list.queryOptions({}).queryKey });

  const deactivate = useMutation({
    mutationFn: () => orpc.employees.deactivate.call({ userId: employee.id }),
    onSuccess: () => {
      toast.success(m.employees_toast_deactivated());
      setDeactivateOpen(false);
      invalidateList();
    },
  });

  const activate = useMutation({
    mutationFn: () => orpc.employees.activate.call({ userId: employee.id }),
    onSuccess: () => {
      toast.success(m.employees_toast_activated());
      invalidateList();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.employees.delete.call({ userId: employee.id }),
    onSuccess: () => {
      toast.success(m.employees_toast_deleted());
      setDeleteOpen(false);
      invalidateList();
    },
  });

  const isDeactivated = employee.banned === true;

  if (isDeactivated) {
    return (
      <>
        <Button
          variant="outline"
          color="success"
          onClick={() => activate.mutate()}
          disabled={activate.isPending}
        >
          <Power />
          {m.employees_btn_activate()}
        </Button>
        <Button variant="outline" color="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 />
          {m.employees_btn_delete()}
        </Button>
        <EmployeeActionModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={m.employees_modal_delete_title()}
          description={m.employees_modal_delete_description({ name: employee.name })}
          confirmLabel={m.employees_btn_delete()}
          onConfirm={() => deleteMutation.mutate()}
          isPending={deleteMutation.isPending}
        />
      </>
    );
  }

  return (
    <>
      <EmployeeModal
        employee={employee}
        trigger={
          <Button variant="outline">
            <IconEdit />
            {m.employees_btn_edit()}
          </Button>
        }
      />
      <ResetPinModal
        employeeId={employee.id}
        trigger={
          <Button variant="outline" color="warning">
            <IconResetPin />
            {m.employees_btn_reset_pin()}
          </Button>
        }
      />
      <Button variant="outline" color="destructive" onClick={() => setDeactivateOpen(true)}>
        <Power />
        {m.employees_btn_deactivate()}
      </Button>
      <EmployeeActionModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={m.employees_modal_deactivate_title()}
        description={m.employees_modal_deactivate_description({ name: employee.name })}
        confirmLabel={m.employees_btn_deactivate()}
        onConfirm={() => deactivate.mutate()}
        isPending={deactivate.isPending}
      />
    </>
  );
}
