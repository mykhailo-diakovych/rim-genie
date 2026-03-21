import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Eye, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import type { UserRole } from "@rim-genie/db/schema";

import { CustomerCard, CustomerCardSkeleton } from "@/components/customers/customer-card";
import { CustomerModal } from "@/components/customers/customer-modal";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { requireRoles } from "@/lib/route-permissions";
import { m } from "@/paraglide/messages";
import { client, orpc } from "@/utils/orpc";

const CAN_EDIT_ROLES: UserRole[] = ["admin", "floorManager"];

export const Route = createFileRoute("/_app/customers/")({
  beforeLoad: requireRoles(["admin", "floorManager", "cashier"]),
  head: () => ({
    meta: [{ title: "Rim-Genie | Customers" }],
  }),
  component: CustomersPage,
});

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

function CustomersPage() {
  const { data: session } = authClient.useSession();
  const userRole = session?.user.role as UserRole | undefined;
  const canEdit = !!userRole && CAN_EDIT_ROLES.includes(userRole);
  const isAdmin = userRole === "admin";

  const { data: customers, isLoading } = useQuery(orpc.floor.customers.list.queryOptions({}));
  const { data: loyaltyConfig } = useQuery(orpc.loyalty.config.get.queryOptions());

  return (
    <div className="flex flex-col gap-5 p-3 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">
          {m.customers_title()}
        </h1>
        {canEdit && (
          <CustomerModal
            trigger={
              <Button>
                <Plus />
                {m.customers_btn_add()}
              </Button>
            }
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <CustomerCardSkeleton key={i} />)}

        {!isLoading && customers?.length === 0 && (
          <p className="py-8 text-center font-rubik text-sm text-label">{m.customers_empty()}</p>
        )}

        {customers?.map((customer) => {
          const isLoyal = loyaltyConfig
            ? customer.paidInvoiceCount >= loyaltyConfig.purchaseThreshold ||
              customer.totalSpent >= loyaltyConfig.spendThreshold
            : false;
          return (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isLoyal={isLoyal}
              actions={
                <>
                  <Button
                    render={
                      <Link to="/customers/$customerId" params={{ customerId: customer.id }} />
                    }
                    nativeButton={false}
                  >
                    <Eye />
                    {m.customers_btn_view()}
                  </Button>
                  {canEdit && (
                    <CustomerModal
                      customer={customer}
                      trigger={
                        <Button variant="outline">
                          <IconEdit />
                          {m.customers_btn_edit()}
                        </Button>
                      }
                    />
                  )}
                </>
              }
            />
          );
        })}
      </div>

      {isAdmin && <ArchivedCustomersSection />}
    </div>
  );
}

function ArchivedCustomersSection() {
  const queryClient = useQueryClient();
  const { data: deleted, isLoading } = useQuery(orpc.floor.customers.deleted.queryOptions({}));

  const restoreMutation = useMutation({
    mutationFn: (id: string) => client.floor.customers.restore({ id }),
    onSuccess: async () => {
      toast.success("Customer restored");
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.list.key() });
      await queryClient.invalidateQueries({ queryKey: orpc.floor.customers.deleted.key() });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !deleted?.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-rubik text-base leading-5 font-medium text-label">
        Archived Customers ({deleted.length})
      </h2>
      <div className="overflow-hidden rounded-xl border border-card-line bg-white shadow-card">
        <table className="w-full font-rubik text-sm">
          <thead>
            <tr className="border-b border-field-line text-left text-xs text-label">
              <th className="px-3 py-2 font-normal">Name</th>
              <th className="px-3 py-2 font-normal">Phone</th>
              <th className="px-3 py-2 font-normal">Archived On</th>
              <th className="w-28 px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {deleted.map((c) => (
              <tr key={c.id} className="border-b border-field-line last:border-b-0">
                <td className="px-3 py-2.5 text-body">{c.name}</td>
                <td className="px-3 py-2.5 text-label">{c.phone}</td>
                <td className="px-3 py-2.5 text-label">
                  {c.deletedAt
                    ? new Date(c.deletedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })
                    : "\u2014"}
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate(c.id)}
                  >
                    <RotateCcw />
                    Restore
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
