import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2.25 font-rubik text-xs leading-[14px] font-normal whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "text-white",
        outline: "",
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
        className: "border-blue text-blue hover:bg-blue/5 focus-visible:ring-blue/50",
      },
      {
        variant: "outline",
        color: "destructive",
        className:
          "border-destructive text-destructive hover:bg-destructive/5 focus-visible:ring-destructive/50",
      },
      {
        variant: "outline",
        color: "success",
        className: "border-green text-green hover:bg-green/5 focus-visible:ring-green/50",
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
