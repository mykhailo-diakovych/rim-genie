import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[#e8eef4] rounded-none animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
