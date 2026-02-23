import { tv } from "tailwind-variants";

const labelVariants = tv({
  base: "select-none font-rubik text-xs leading-3.5 text-label",
});

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={labelVariants({ className })} {...props} />;
}

export { Label };
