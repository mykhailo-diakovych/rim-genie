import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({ ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List className={cn("flex border-b border-field-line", className)} {...props} />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "flex h-9 cursor-pointer items-center justify-center px-3 py-2 font-rubik text-[14px] leading-[18px] text-body transition-colors outline-none",
        "data-[active]:border-b-2 data-[active]:border-blue data-[active]:text-blue",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
