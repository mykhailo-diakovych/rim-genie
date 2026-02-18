import { useEffect, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { LogOut, Search } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { Skeleton } from "@/components/ui/skeleton";

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppHeader() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    void navigate({ to: "/login" });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between pr-5 border-b border-card-line bg-white shadow-[0px_2px_24px_0px_rgba(42,44,45,0.04)]">
      {/* Left block */}
      <div className="flex items-center gap-5">
        {/* Logo */}
        <div className="flex h-16 w-20 shrink-0 items-center justify-center">
          <img src="/logo.png" alt="Rim Genie" className="h-12 w-auto" />
        </div>

        {/* Search — hidden on mobile, full bar on md+ */}
        <div className="hidden md:flex w-80 items-center gap-4 rounded-[8px] border border-field-line bg-white px-3 py-[10px]">
          <span className="min-w-0 flex-1 font-rubik text-[12px] leading-[14px] text-ghost">
            {m.header_search_placeholder()}
          </span>
          <Search className="size-4 shrink-0 text-ghost" />
        </div>
      </div>

      {/* Right block */}
      <div className="flex items-center gap-3">
        {/* Search icon — mobile only */}
        <button
          type="button"
          className="flex md:hidden h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0f5fa]"
          aria-label={m.header_search_placeholder()}
        >
          <Search className="size-4 text-ghost" />
        </button>

        {/* User name + datetime stacked */}
        {isPending ? (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-[18px] w-28 rounded" />
            <Skeleton className="hidden md:block h-[14px] w-24 rounded" />
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-start justify-center">
            <span className="font-rubik text-[14px] font-medium leading-[18px] text-body">
              {session?.user.name}
            </span>
            <span className="hidden md:block font-rubik text-[12px] leading-[14px] text-label">
              {formatDateTime(now)}
            </span>
          </div>
        )}

        {/* Logout icon button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0f5fa] transition-colors hover:bg-[#e4ecf5]"
          aria-label={m.btn_logout()}
        >
          <LogOut className="size-4 text-blue" />
        </button>
      </div>
    </header>
  );
}
