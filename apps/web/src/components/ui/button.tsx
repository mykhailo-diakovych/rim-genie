import type { VariantProps } from "tailwind-variants";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { tv } from "tailwind-variants";

export const buttonVariants = tv({
  base: "inline-flex h-9 items-center justify-center rounded-[8px] px-3 font-rubik text-[12px] leading-[14px] outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      default: "bg-blue text-white hover:bg-blue/90",
      success: "bg-green text-white hover:bg-green/90",
      ghost: "text-body hover:opacity-70",
      outline:
        "border border-border bg-background text-foreground hover:bg-muted dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-9",
      sm: "h-7 px-2.5 text-xs",
      lg: "h-10 px-4",
      icon: "size-9 p-0",
    },
    fullWidth: {
      true: "w-full",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size,
  fullWidth,
  ...props
}: Omit<ButtonPrimitive.Props, "className"> & ButtonVariants & { className?: string }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}

export { Button };
