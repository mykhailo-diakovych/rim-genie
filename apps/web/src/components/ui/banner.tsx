import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const bannerVariants = cva(
  "flex items-center gap-4 rounded-lg px-4 py-3 font-rubik text-base leading-6 font-semibold",
  {
    variants: {
      variant: {
        navy: "bg-banner-navy text-banner-navy-foreground",
      },
    },
    defaultVariants: {
      variant: "navy",
    },
  },
);

function Banner({
  className,
  variant,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bannerVariants> & {
    icon?: React.ReactNode;
  }) {
  return (
    <div data-slot="banner" className={cn(bannerVariants({ variant, className }))} {...props}>
      {icon && (
        <>
          <span className="flex shrink-0 [&_svg:not([class*='size-'])]:size-6">{icon}</span>
          <span aria-hidden className="h-6 w-px shrink-0 bg-current opacity-30" />
        </>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export { Banner, bannerVariants };
