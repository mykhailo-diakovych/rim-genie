import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-none bg-[#e8eef4]", className)}
      {...props}
    />
  );
}

export { Skeleton };
