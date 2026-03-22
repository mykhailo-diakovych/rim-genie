import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@rim-genie/auth";
import { getDailyReportPdf } from "@rim-genie/api/pdf/get-daily-report-pdf";

export const Route = createFileRoute("/api/reports/daily/$date")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session || session.user.role !== "admin") {
          return new Response("Unauthorized", { status: 401 });
        }

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(params.date)) {
          return new Response("Invalid date format. Use YYYY-MM-DD.", { status: 400 });
        }

        const buffer = await getDailyReportPdf(params.date);

        return new Response(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="daily-report-${params.date}.pdf"`,
          },
        });
      },
    },
  },
});
