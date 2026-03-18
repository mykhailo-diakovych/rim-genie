import { auth } from "@rim-genie/auth";
import { getInvoicePdf } from "@rim-genie/api/pdf/get-invoice-pdf";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/invoices/$invoiceId/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await getInvoicePdf(params.invoiceId);
        if (!result) {
          return new Response("Invoice not found", { status: 404 });
        }

        return new Response(new Uint8Array(result.buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="invoice-${result.invoiceNumber}.pdf"`,
          },
        });
      },
    },
  },
});
