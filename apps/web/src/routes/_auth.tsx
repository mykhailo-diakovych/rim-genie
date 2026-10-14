import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";
import { getUser } from "@/functions/get-user";
import { safeRedirect } from "@/lib/safe-redirect";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ search }) => {
    const session = await getUser();
    if (session) {
      const target = safeRedirect((search as { redirect?: unknown }).redirect);
      throw target ? redirect({ href: target }) : redirect({ to: "/dashboard" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-page font-rubik">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Outlet />
      </div>
      <footer className="flex h-10 items-center justify-center border-t border-card-line bg-white px-5">
        <p className="font-poppins text-xs leading-4.5 text-dim">{m.copyright()}</p>
      </footer>
    </div>
  );
}
