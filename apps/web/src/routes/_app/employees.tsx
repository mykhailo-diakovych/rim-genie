import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { isPlaceholderEmail } from "@rim-genie/db/employee-email";
import { type UserRole, userRoleEnum } from "@rim-genie/db/schema";
import { KeyRound, Mail, MapPin, Plus, Power, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ResetPinModal } from "@/components/auth/reset-pin-modal";
import {
  EmployeeCard,
  type EmployeeCardData,
  EmployeeCardSkeleton,
  IconEdit,
} from "@/components/employees/employee-card";
import { EmployeeModal } from "@/components/employees/employee-modal";
import { ROLE_LABELS } from "@/components/employees/role-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  RowActionsMenu,
  RowActionsMenuItem,
  RowActionsMenuSeparator,
} from "@/components/ui/row-actions-menu";
import { Select, SelectOption, SelectPopup, SelectTrigger } from "@/components/ui/select";
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

const ALL = "all";

function matchesSearch(employee: EmployeeCardData, query: string) {
  if (!query) return true;
  const haystack = [
    employee.name,
    employee.username ?? "",
    isPlaceholderEmail(employee.email) ? "" : employee.email,
  ];
  return haystack.some((value) => value.toLowerCase().includes(query));
}

function EmployeesPage() {
  const { data: employees, isLoading } = useQuery(orpc.employees.list.queryOptions({}));
  const { data: locations } = useQuery(orpc.locations.queryOptions({}));

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | typeof ALL>(ALL);
  const [locationFilter, setLocationFilter] = useState<string>(ALL);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (employees ?? []).filter(
      (employee) =>
        matchesSearch(employee, query) &&
        (roleFilter === ALL || employee.role === roleFilter) &&
        (locationFilter === ALL || employee.locations.some((l) => l.id === locationFilter)),
    );
  }, [employees, search, roleFilter, locationFilter]);

  const total = employees?.length ?? 0;
  const selectedLocationName = locations?.find((l) => l.id === locationFilter)?.name;

  return (
    <div className="flex flex-col gap-5 p-3 sm:p-5">
      <PageHeader
        title={m.employees_title()}
        description={m.employees_subtitle()}
        actions={
          <EmployeeModal
            trigger={
              <Button>
                <Plus />
                {m.employees_btn_add()}
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:flex-1">
          <Input
            value={search}
            placeholder={m.employees_search_placeholder()}
            leadingIcon={<Search className="size-4" />}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter((value as UserRole | null) ?? ALL)}
        >
          <SelectTrigger className="sm:w-48">
            <span className="min-w-0 flex-1 truncate text-left text-body">
              {roleFilter === ALL ? m.employees_filter_all_roles() : ROLE_LABELS[roleFilter]()}
            </span>
          </SelectTrigger>
          <SelectPopup>
            <SelectOption value={ALL}>{m.employees_filter_all_roles()}</SelectOption>
            {userRoleEnum.enumValues.map((role) => (
              <SelectOption key={role} value={role}>
                {ROLE_LABELS[role]()}
              </SelectOption>
            ))}
          </SelectPopup>
        </Select>

        <Select
          value={locationFilter}
          onValueChange={(value) => setLocationFilter((value as string | null) ?? ALL)}
        >
          <SelectTrigger className="sm:w-56">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-ghost" />
              <span className="min-w-0 truncate text-left text-body">
                {selectedLocationName ?? m.employees_filter_all_locations()}
              </span>
            </div>
          </SelectTrigger>
          <SelectPopup>
            <SelectOption value={ALL}>{m.employees_filter_all_locations()}</SelectOption>
            {(locations ?? []).map((loc) => (
              <SelectOption key={loc.id} value={loc.id}>
                {loc.name}
              </SelectOption>
            ))}
          </SelectPopup>
        </Select>

        {!isLoading && (
          <span className="font-rubik text-sm whitespace-nowrap text-label sm:ml-2">
            {m.employees_count({ count: filtered.length })}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <EmployeeCardSkeleton key={i} />)}

        {!isLoading && filtered.length === 0 && (
          <p className="py-8 text-center font-rubik text-sm text-label">
            {total === 0 ? m.employees_empty() : m.employees_empty_filtered()}
          </p>
        )}

        {filtered.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            actions={<EmployeeActions employee={employee} />}
          />
        ))}
      </div>

      {!isLoading && total > 0 && (
        <p className="font-rubik text-sm text-label">
          {m.employees_showing({ shown: filtered.length, total })}
        </p>
      )}
    </div>
  );
}

function EmployeeActions({ employee }: { employee: EmployeeCardData }) {
  const queryClient = useQueryClient();
  const [resetPinOpen, setResetPinOpen] = useState(false);
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
    onError: (err: Error) => toast.error(err.message),
  });

  const activate = useMutation({
    mutationFn: () => orpc.employees.activate.call({ userId: employee.id }),
    onSuccess: () => {
      toast.success(m.employees_toast_activated());
      invalidateList();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.employees.delete.call({ userId: employee.id }),
    onSuccess: () => {
      toast.success(m.employees_toast_deleted());
      setDeleteOpen(false);
      invalidateList();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendInvite = useMutation({
    mutationFn: () => orpc.employees.resendInvite.call({ userId: employee.id }),
    onSuccess: () => {
      toast.success(m.employees_toast_invite_sent({ email: employee.email }));
      invalidateList();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isDeactivated = employee.banned === true;
  const hasEmail = !isPlaceholderEmail(employee.email);

  return (
    <>
      {!isDeactivated && (
        <EmployeeModal
          employee={employee}
          trigger={
            <Button variant="outline">
              <IconEdit />
              {m.employees_btn_edit()}
            </Button>
          }
        />
      )}

      <RowActionsMenu label={m.employees_more_actions()} className="size-9">
        {isDeactivated ? (
          <>
            <RowActionsMenuItem disabled={activate.isPending} onClick={() => activate.mutate()}>
              <Power />
              {m.employees_btn_activate()}
            </RowActionsMenuItem>
            <RowActionsMenuSeparator />
            <RowActionsMenuItem destructive onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              {m.employees_btn_delete()}
            </RowActionsMenuItem>
          </>
        ) : (
          <>
            <RowActionsMenuItem onClick={() => setResetPinOpen(true)}>
              <KeyRound />
              {m.employees_btn_reset_pin()}
            </RowActionsMenuItem>
            {hasEmail && (
              <RowActionsMenuItem
                disabled={resendInvite.isPending}
                onClick={() => resendInvite.mutate()}
              >
                <Mail />
                {resendInvite.isPending
                  ? m.employees_btn_sending_invite()
                  : m.employees_btn_resend_invite()}
              </RowActionsMenuItem>
            )}
            <RowActionsMenuSeparator />
            <RowActionsMenuItem destructive onClick={() => setDeactivateOpen(true)}>
              <Power />
              {m.employees_btn_deactivate()}
            </RowActionsMenuItem>
          </>
        )}
      </RowActionsMenu>

      <ResetPinModal employeeId={employee.id} open={resetPinOpen} onOpenChange={setResetPinOpen} />
      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={m.employees_modal_deactivate_title()}
        description={m.employees_modal_deactivate_description({ name: employee.name })}
        confirmLabel={m.employees_btn_deactivate()}
        onConfirm={() => deactivate.mutate()}
        isPending={deactivate.isPending}
        destructive
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={m.employees_modal_delete_title()}
        description={m.employees_modal_delete_description({ name: employee.name })}
        confirmLabel={m.employees_btn_delete()}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        destructive
      />
    </>
  );
}
