import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Percent, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { orpc, client } from "@/utils/orpc";
import { Skeleton } from "@/components/ui/skeleton";

const typeConfig: Record<string, { icon: React.ElementType; className: string }> = {
  inventory_discrepancy: { icon: AlertTriangle, className: "text-amber-500 bg-amber-50" },
  discount_request: { icon: Percent, className: "text-blue bg-blue/10" },
  discount_approved: { icon: ThumbsUp, className: "text-emerald-600 bg-emerald-50" },
  discount_rejected: { icon: ThumbsDown, className: "text-red-500 bg-red-50" },
  job_completed: { icon: Wrench, className: "text-emerald-600 bg-emerald-50" },
};

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNavigationTarget(
  referenceType?: string | null,
  referenceId?: string | null,
): { to: string; params?: Record<string, string> } | null {
  if (!referenceType || !referenceId) return null;
  switch (referenceType) {
    case "inventory_item":
      return { to: "/manage" };
    case "invoice":
      return { to: "/cashier/$invoiceId", params: { invoiceId: referenceId } };
    case "discount_request":
      return { to: "/discount-approvals/$requestId", params: { requestId: referenceId } };
    case "quote":
      return { to: "/floor/$quoteId", params: { quoteId: referenceId } };
    case "customer":
      return { to: "/customers/$customerId", params: { customerId: referenceId } };
    case "job":
      return { to: "/technician" };
    default:
      return null;
  }
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isPending } = useQuery(
    orpc.notifications.list.queryOptions({ input: {} }),
  );

  const markRead = useMutation({
    mutationFn: (id: string) => client.notifications.markRead({ id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orpc.notifications.list.key() });
      void queryClient.invalidateQueries({
        queryKey: orpc.notifications.unreadCount.key(),
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => client.notifications.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orpc.notifications.list.key() });
      void queryClient.invalidateQueries({
        queryKey: orpc.notifications.unreadCount.key(),
      });
    },
  });

  const hasUnread = notifications?.some((n) => !n.isRead);

  function handleClick(notification: NonNullable<typeof notifications>[number]) {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    const target = getNavigationTarget(notification.referenceType, notification.referenceId);
    if (target) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void navigate(target as any);
      onClose();
    }
  }

  return (
    <div className="flex w-80 flex-col overflow-hidden rounded-lg border border-field-line bg-popover shadow-dialog">
      <div className="flex items-center justify-between border-b border-field-line px-4 py-3">
        <h3 className="font-rubik text-sm font-medium text-body">Notifications</h3>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="font-rubik text-xs text-blue transition-colors hover:text-blue/80"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications?.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8">
            <Bell className="size-8 text-ghost" />
            <p className="font-rubik text-sm text-label">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const config = typeConfig[n.type] ?? {
              icon: Bell,
              className: "text-label bg-page",
            };
            const Icon = config.icon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-page",
                  !n.isRead && "bg-blue/5",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    config.className,
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "line-clamp-1 font-rubik text-xs",
                        n.isRead ? "text-label" : "font-medium text-body",
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-blue" />}
                  </div>
                  <p className="line-clamp-2 font-rubik text-xs text-label">{n.message}</p>
                  <p className="mt-1 font-rubik text-xs text-ghost">
                    {getRelativeTime(new Date(n.createdAt))}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
