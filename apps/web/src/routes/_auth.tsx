import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="font-rubik flex min-h-svh flex-col bg-page">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Outlet />
      </div>
      <footer className="flex h-10 items-center justify-center border-t border-card-line bg-white px-5">
        <p className="font-poppins text-[12px] leading-[18px] text-dim">{m.copyright()}</p>
      </footer>
    </div>
  );
}
