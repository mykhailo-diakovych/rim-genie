import { createContext, useContext } from "react";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { tv } from "tailwind-variants";

import { cn } from "@/lib/utils";

type Orientation = "horizontal" | "vertical";

const OrientationContext = createContext<Orientation>("horizontal");

const tabsList = tv({
  base: "flex",
  variants: {
    orientation: {
      horizontal: "border-b border-field-line",
      vertical: "flex-col gap-0.5",
    },
  },
});

const tabsTrigger = tv({
  base: "flex h-9 cursor-pointer items-center font-rubik text-sm leading-4.5 text-body transition-colors outline-none",
  variants: {
    orientation: {
      horizontal:
        "justify-center px-3 py-2 data-[active]:border-b-2 data-[active]:border-blue data-[active]:text-blue",
      vertical:
        "w-full justify-start rounded-md px-3 py-2 whitespace-nowrap hover:bg-page data-[active]:bg-blue/10 data-[active]:font-medium data-[active]:text-blue",
    },
  },
});

function Tabs({ orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <OrientationContext.Provider value={orientation}>
      <TabsPrimitive.Root orientation={orientation} {...props} />
    </OrientationContext.Provider>
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  const orientation = useContext(OrientationContext);
  return <TabsPrimitive.List className={cn(tabsList({ orientation }), className)} {...props} />;
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const orientation = useContext(OrientationContext);
  return <TabsPrimitive.Tab className={cn(tabsTrigger({ orientation }), className)} {...props} />;
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
