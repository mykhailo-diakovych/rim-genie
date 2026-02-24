import type { ToasterProps } from "sonner";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-4 text-green" />,
      info: <InfoIcon className="size-4 text-blue" />,
      warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
      error: <OctagonXIcon className="size-4 text-red" />,
      loading: <Loader2Icon className="size-4 animate-spin text-label" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "font-rubik! text-sm! bg-white! text-body! border-field-line! rounded-lg! shadow-dialog!",
        title: "text-sm! font-medium! text-body!",
        description: "text-xs! text-label!",
        actionButton: "bg-body! text-white!",
        cancelButton: "bg-page! text-label!",
        closeButton: "text-ghost! border-field-line! bg-white!",
      },
    }}
    {...props}
  />
);

export { Toaster };
