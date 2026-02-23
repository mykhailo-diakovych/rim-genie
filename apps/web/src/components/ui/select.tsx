import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Select<Value = string>({ ...props }: SelectPrimitive.Root.Props<Value>) {
  return <SelectPrimitive.Root {...props} />;
}

function SelectTrigger({
  className,
  children,
  error,
  ...props
}: SelectPrimitive.Trigger.Props & { error?: boolean }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-[8px] border bg-white px-2 font-rubik text-[12px] leading-[14px] transition-colors outline-none",
        error ? "border-red/50" : "border-field-line",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0">
        <ChevronDown className="size-4 text-ghost" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({
  className,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Value
      className={cn("min-w-0 flex-1 truncate text-left text-body", className)}
      placeholder={<span className="text-ghost">{placeholder}</span>}
      {...props}
    />
  );
}

function SelectPopup({ className, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner className="z-50 outline-none">
        <SelectPrimitive.Popup
          className={cn(
            "max-h-[--available-height] w-[--anchor-width] origin-[--transform-origin] overflow-y-auto rounded-md border border-field-line bg-white py-1 shadow-[0px_4px_16px_0px_rgba(42,44,45,0.12)] outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectOption({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "flex cursor-default items-center justify-between px-3 py-2 font-rubik text-xs leading-3.5 text-body outline-none select-none",
        "data-highlighted:bg-blue/5 data-selected:text-blue",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-2 shrink-0">
        <Check className="size-3 text-blue" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectGroup({ ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group {...props} />;
}

export { Select, SelectTrigger, SelectValue, SelectPopup, SelectOption, SelectGroup };
