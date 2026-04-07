import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/terms")({
  beforeLoad: ({ search }) => {
    const quoteId = (search as { quoteId?: string }).quoteId;
    if (quoteId) {
      throw redirect({ to: "/floor/$quoteId", params: { quoteId } });
    }
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
