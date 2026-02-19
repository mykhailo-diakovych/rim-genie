import { auth } from "@rim-genie/auth";
import { getQuotePdf } from "@rim-genie/api/pdf/get-quote-pdf";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/quotes/$quoteId/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await getQuotePdf(params.quoteId);
        if (!result) {
          return new Response("Quote not found", { status: 404 });
        }

        return new Response(new Uint8Array(result.buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="quote-${result.quoteNumber}.pdf"`,
          },
        });
      },
    },
  },
});
