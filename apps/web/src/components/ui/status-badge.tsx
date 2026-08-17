import { cn } from "@/lib/utils";

// One colour per status, so a glance at a list tells you where the work stands.
// `pending` and `accepted` previously shared the same blue, which made the two
// states indistinguishable on the customer profile.
const STATUS_BG: Record<string, string> = {
  draft: "bg-ghost",
  pending: "bg-badge-blue",
  accepted: "bg-badge-cyan",
  in_progress: "bg-badge-orange",
  completed: "bg-badge-green",
};

function toLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5 font-rubik text-xs leading-3.5 text-white",
        STATUS_BG[status] ?? "bg-ghost",
        className,
      )}
    >
      {toLabel(status)}
    </span>
  );
}
