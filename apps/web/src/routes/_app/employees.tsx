import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ResetPinModal } from "@/components/auth/reset-pin-modal";
import {
  EmployeeCard,
  EmployeeCardSkeleton,
  IconEdit,
  IconResetPin,
} from "@/components/employees/employee-card";
import { EmployeeModal } from "@/components/employees/employee-modal";
import { Button } from "@/components/ui/button";
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
            actions={
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
                    <Button variant="outline" color="destructive">
                      <IconResetPin />
                      {m.employees_btn_reset_pin()}
                    </Button>
                  }
                />
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
