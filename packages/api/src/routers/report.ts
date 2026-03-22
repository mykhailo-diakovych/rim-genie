import { z } from "zod";

import { adminProcedure } from "../index";
import * as ReportService from "../services/report.service";

export const reportRouter = {
  daily: adminProcedure.input(z.object({ date: z.string().date() })).handler(async ({ input }) => {
    return ReportService.generateDailyReport(input.date);
  }),
};
