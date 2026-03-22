import { renderToBuffer } from "@react-pdf/renderer";

import { generateDailyReport } from "../services/report.service";
import { DailyReportDocument } from "./daily-report-document";

export async function getDailyReportPdf(date: string): Promise<Buffer> {
  const data = await generateDailyReport(date);
  return renderToBuffer(<DailyReportDocument data={data} />);
}
