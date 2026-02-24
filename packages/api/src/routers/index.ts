import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { cashierRouter } from "./cashier";
import { dashboardRouter } from "./dashboard";
import { employeesRouter } from "./employees";
import { floorRouter } from "./floor";
import { inventoryRouter } from "./inventory";
import { manageRouter } from "./manage";
import { technicianRouter } from "./technician";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session.user,
  })),
  cashier: cashierRouter,
  employees: employeesRouter,
  floor: floorRouter,
  inventory: inventoryRouter,
  manage: manageRouter,
  technician: technicianRouter,
  dashboard: dashboardRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
