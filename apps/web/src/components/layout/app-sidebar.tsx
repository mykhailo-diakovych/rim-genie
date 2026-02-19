import { useMatchRoute, Link } from "@tanstack/react-router";
import { tv } from "tailwind-variants";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  IconCashier,
  IconCustomers,
  IconDashboard,
  IconEmployees,
  IconFloor,
  IconInventory,
  IconManage,
  IconTechnician,
  IconTerms,
} from "@/components/ui/nav-icons";

const navItem = tv({
  slots: {
    root: "flex cursor-pointer items-center transition-colors",
    icon: "shrink-0 size-6",
    label: "font-rubik text-[12px] leading-[18px] font-normal",
  },
  variants: {
    orientation: {
      vertical: {
        root: "relative flex-col justify-center gap-1 py-2 w-full",
        label: "text-center",
      },
      horizontal: {
        root: "flex-col items-center justify-center gap-1 py-2 px-2 min-w-[72px]",
        label: "text-center",
      },
    },
    active: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    {
      orientation: "vertical",
      active: true,
      class: {
        root: "bg-blue/10 border-r-2 border-blue",
        icon: "text-blue",
        label: "text-blue",
      },
    },
    {
      orientation: "vertical",
      active: false,
      class: {
        root: "hover:bg-page",
        icon: "text-ghost",
        label: "text-body",
      },
    },
    {
      orientation: "horizontal",
      active: true,
      class: {
        root: "border-b-2 border-blue",
        icon: "text-blue",
        label: "text-blue",
      },
    },
    {
      orientation: "horizontal",
      active: false,
      class: {
        root: "border-b-2 border-transparent hover:border-ghost/30",
        icon: "text-ghost",
        label: "text-body",
      },
    },
  ],
  defaultVariants: {
    orientation: "vertical",
    active: false,
  },
});

const NAV_ITEMS = [
  { to: "/dashboard", labelKey: "nav_dashboard" as const, icon: IconDashboard },
  { to: "/floor", labelKey: "nav_floor" as const, icon: IconFloor },
  { to: "/inventory", labelKey: "nav_inventory" as const, icon: IconInventory },
  { to: "/cashier", labelKey: "nav_cashier" as const, icon: IconCashier },
  { to: "/technician", labelKey: "nav_technician" as const, icon: IconTechnician },
  { to: "/employees", labelKey: "nav_employees" as const, icon: IconEmployees },
  { to: "/customers", labelKey: "nav_customers" as const, icon: IconCustomers },
  { to: "/manage", labelKey: "nav_manage" as const, icon: IconManage },
  { to: "/terms", labelKey: "nav_terms" as const, icon: IconTerms },
] as const;

interface AppSidebarProps {
  horizontal?: boolean;
  className?: string;
}

export function AppSidebar({ horizontal = false, className }: AppSidebarProps) {
  const matchRoute = useMatchRoute();
  const orientation = horizontal ? "horizontal" : "vertical";

  if (horizontal) {
    return (
      <nav
        className={cn(
          "flex shrink-0 overflow-x-auto border-b border-card-line bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
          const isActive = !!matchRoute({ to, fuzzy: true });
          const { root, icon, label } = navItem({ orientation, active: isActive });
          return (
            <Link key={to} to={to} className={root()}>
              <Icon className={icon()} />
              <span className={label()}>{m[labelKey]()}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "flex w-20 shrink-0 flex-col overflow-y-auto border-r border-card-line bg-white",
        className,
      )}
    >
      {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
        const isActive = !!matchRoute({ to, fuzzy: true });
        const { root, icon, label } = navItem({ orientation, active: isActive });
        return (
          <Link key={to} to={to} className={root()}>
            <Icon className={icon()} />
            <span className={label()}>{m[labelKey]()}</span>
          </Link>
        );
      })}
    </nav>
  );
}
