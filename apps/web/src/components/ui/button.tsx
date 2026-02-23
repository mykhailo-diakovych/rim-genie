import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2.5 font-rubik text-xs font-normal whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "text-white",
        outline: "ring",
        ghost: "text-body hover:bg-muted focus-visible:ring-ring/50",
      },
      color: {
        default: "",
        destructive: "",
        success: "",
      },
      size: {
        default: "",
        "icon-sm": "size-7 p-0",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        color: "default",
        className: "bg-blue hover:bg-blue/90 focus-visible:ring-blue/50",
      },
      {
        variant: "default",
        color: "destructive",
        className: "bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/50",
      },
      {
        variant: "default",
        color: "success",
        className: "bg-green hover:bg-green/90 focus-visible:ring-green/50",
      },
      {
        variant: "outline",
        color: "default",
        className: "text-blue ring-blue hover:bg-blue/5 focus-visible:ring-blue/50",
      },
      {
        variant: "outline",
        color: "destructive",
        className:
          "text-destructive ring-destructive hover:bg-destructive/5 focus-visible:ring-destructive/50 disabled:bg-transparent disabled:text-ghost disabled:ring-ghost",
      },
      {
        variant: "outline",
        color: "success",
        className: "text-green ring-green hover:bg-green/5 focus-visible:ring-green/50",
      },
    ],
    defaultVariants: {
      variant: "default",
      color: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  color = "default",
  size = "default",
  fullWidth,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    fullWidth?: boolean;
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size, className }), fullWidth && "w-full")}
      {...props}
    />
  );
}

export { Button, buttonVariants };
