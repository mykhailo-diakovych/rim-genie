import { useState, useRef, useEffect } from "react";

import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = useQuery({
    ...orpc.notifications.unreadCount.queryOptions({}),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f0f5fa] transition-colors hover:bg-[#e4ecf5]"
        aria-label="Notifications"
      >
        <Bell className="size-4 text-blue" />
        {!!unreadCount && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-rubik text-[10px] leading-none font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2">
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
