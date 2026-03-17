import { Outlet, createFileRoute, redirect, useParams } from "@tanstack/react-router";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  component: AppLayout,
});

function AppLayout() {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId?: string };
  const hideSidebar = !!invoiceId;

  return (
    <div className="flex h-svh flex-col font-rubik">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && <AppSidebar className="hidden md:flex" />}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {!hideSidebar && <AppSidebar horizontal className="md:hidden" />}
          <Outlet />
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
