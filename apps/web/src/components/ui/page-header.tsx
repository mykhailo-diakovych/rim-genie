import type * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-rubik text-[22px] leading-6.5 font-medium text-body">{title}</h1>
        {description && <p className="font-rubik text-sm leading-4.5 text-label">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
