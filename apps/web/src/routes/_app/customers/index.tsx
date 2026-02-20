import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Eye, Plus } from "lucide-react";

import type { UserRole } from "@rim-genie/db/schema";

import { CustomerCard, CustomerCardSkeleton } from "@/components/customers/customer-card";
import { CustomerModal } from "@/components/customers/customer-modal";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

const ALLOWED_ROLES: UserRole[] = ["admin", "floorManager", "cashier"];
const CAN_EDIT_ROLES: UserRole[] = ["admin", "floorManager"];

export const Route = createFileRoute("/_app/customers/")({
  beforeLoad: ({ context }) => {
    const role = context.session.user.role as UserRole | null;
    if (!role || !ALLOWED_ROLES.includes(role)) {
      throw redirect({ to: "/dashboard" });
    }
  },
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

  const { data: customers, isLoading } = useQuery(orpc.floor.customers.list.queryOptions({}));

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
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

        {customers?.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            actions={
              <>
                <Button render={<Link to="/customers/$customerId" params={{ customerId: customer.id }} />}>
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
        ))}
      </div>
    </div>
  );
}
