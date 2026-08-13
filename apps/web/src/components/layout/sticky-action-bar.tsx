import type { ReactNode } from "react";

import { cn } from "@/lib/utils";


export function StickyActionBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-3 -mt-3 flex flex-wrap items-center gap-2 bg-white px-3 pt-3 pb-2 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
