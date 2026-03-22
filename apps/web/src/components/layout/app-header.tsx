import { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, MapPin, Search } from "lucide-react";

import { CommandPalette } from "@/components/search/command-palette";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Select, SelectOption, SelectPopup, SelectTrigger } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";
import { Skeleton } from "@/components/ui/skeleton";

function getLocationCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)rim-genie-location=([^;]*)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

function setLocationCookie(locationId: string | null) {
  if (locationId) {
    document.cookie = `rim-genie-location=${encodeURIComponent(locationId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } else {
    document.cookie = "rim-genie-location=; path=/; max-age=0";
  }
}

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
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  const isAdmin = session?.user?.role === "admin";
  const { data: locations } = useQuery(orpc.locations.queryOptions({}));
  const [activeLocId, setActiveLocId] = useState<string | null>(() =>
    typeof document !== "undefined" ? getLocationCookie() : null,
  );

  const activeLocationName = locations?.find((l) => l.id === activeLocId)?.name;

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    void navigate({ to: "/login" });
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-card-line bg-white pr-5 shadow-[0px_2px_24px_0px_rgba(42,44,45,0.04)]">
        {/* Left block */}
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="flex h-16 w-20 shrink-0 items-center justify-center">
            <img src="/logo.png" alt="Rim Genie" className="h-12 w-auto" />
          </div>

          {/* Search — hidden on mobile, full bar on md+ */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden w-80 items-center gap-4 rounded-md border border-field-line bg-white px-3 py-[10px] md:flex"
          >
            <span className="min-w-0 flex-1 text-left font-rubik text-xs leading-3.5 text-ghost">
              {m.header_search_placeholder()}
            </span>
            <kbd className="shrink-0 rounded border border-field-line bg-page px-1.5 py-0.5 font-rubik text-[10px] text-ghost">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </button>
        </div>

        {/* Right block */}
        <div className="flex items-center gap-3">
          {/* Search icon — mobile only */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f0f5fa] md:hidden"
            aria-label={m.header_search_placeholder()}
          >
            <Search className="size-4 text-ghost" />
          </button>

          <NotificationBell />

          {/* Location badge / picker */}
          {locations &&
            locations.length > 0 &&
            (isAdmin ? (
              <div className="hidden md:block">
                <Select
                  value={activeLocId}
                  onValueChange={(val) => {
                    setActiveLocId(val);
                    setLocationCookie(val);
                    void queryClient.invalidateQueries();
                  }}
                >
                  <SelectTrigger className="h-8 gap-1.5 px-2.5 text-xs">
                    <MapPin className="size-3.5 text-ghost" />
                    <span className="min-w-0 truncate">
                      {activeLocationName ?? "All Locations"}
                    </span>
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectOption value={null}>All Locations</SelectOption>
                    {locations.map((loc) => (
                      <SelectOption key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectOption>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            ) : activeLocationName ? (
              <div className="hidden items-center gap-1.5 rounded-md bg-blue/10 px-2.5 py-1.5 md:flex">
                <MapPin className="size-3.5 text-blue" />
                <span className="font-rubik text-xs font-medium text-blue">
                  {activeLocationName}
                </span>
              </div>
            ) : null)}

          {/* User name + datetime stacked */}
          {isPending ? (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-[18px] w-28 rounded" />
              <Skeleton className="hidden h-[14px] w-24 rounded md:block" />
            </div>
          ) : (
            <div className="flex flex-col items-start justify-center gap-1">
              <span className="font-rubik text-sm leading-4.5 font-medium text-body">
                {session?.user.name}
              </span>
              <span className="hidden font-rubik text-xs leading-3.5 text-label md:block">
                {formatDateTime(now)}
              </span>
            </div>
          )}

          {/* Logout icon button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-10 w-9 shrink-0 items-center justify-center rounded-md bg-[#f0f5fa] transition-colors hover:bg-[#e4ecf5]"
            aria-label={m.btn_logout()}
          >
            <LogOut className="size-4 text-blue" />
          </button>
        </div>
      </header>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
