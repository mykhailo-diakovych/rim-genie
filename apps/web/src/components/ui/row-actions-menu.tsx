import { Ellipsis } from "lucide-react";
import type * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

interface RowActionsMenuProps {
  children: React.ReactNode;
  label?: string;
  disabled?: boolean;
  align?: React.ComponentProps<typeof DropdownMenuContent>["align"];
  className?: string;
  contentClassName?: string;
}

function RowActionsMenu({
  children,
  label = "More actions",
  disabled,
  align = "end",
  className,
  contentClassName,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={label}
        disabled={disabled}
        onClick={stopPropagation}
        className={cn(
          "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-field-line bg-white text-body transition-colors outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-blue/50 disabled:pointer-events-none disabled:opacity-45 data-popup-open:border-blue data-popup-open:bg-blue/5 data-popup-open:text-blue",
          className,
        )}
      >
        <Ellipsis className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        onClick={stopPropagation}
        className={cn(
          "min-w-44 rounded-md border border-field-line bg-white p-1 shadow-md ring-0",
          contentClassName,
        )}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowActionsMenuItem({
  className,
  destructive = false,
  ...props
}: Omit<React.ComponentProps<typeof DropdownMenuItem>, "variant" | "inset"> & {
  destructive?: boolean;
}) {
  return (
    <DropdownMenuItem
      variant={destructive ? "destructive" : "default"}
      className={cn(
        "min-h-10 cursor-pointer gap-2.5 rounded-sm px-3 font-rubik text-sm leading-4.5 text-body focus:bg-page focus:text-body not-data-[variant=destructive]:focus:**:text-body data-[variant=destructive]:text-red data-[variant=destructive]:focus:bg-error-50 data-[variant=destructive]:focus:text-red data-[variant=destructive]:*:[svg]:text-red",
        className,
      )}
      {...props}
    />
  );
}

function RowActionsMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return <DropdownMenuSeparator className={cn("mx-0 my-1 bg-field-line", className)} {...props} />;
}

export { RowActionsMenu, RowActionsMenuItem, RowActionsMenuSeparator };
export type { RowActionsMenuProps };
