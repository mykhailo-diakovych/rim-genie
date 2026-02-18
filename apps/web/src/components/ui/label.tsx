import { tv } from "tailwind-variants";

const labelVariants = tv({
  base: "select-none font-rubik text-[12px] leading-[14px] text-label",
});

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={labelVariants({ className })} {...props} />;
}

export { Label };
