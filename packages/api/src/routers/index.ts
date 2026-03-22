import type { RouterClient } from "@orpc/server";
import { asc } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { location } from "@rim-genie/db/schema";

import { protectedProcedure, publicProcedure } from "../index";
import { cashierRouter } from "./cashier";
import { dashboardRouter } from "./dashboard";
import { discountRouter } from "./discount";
import { employeesRouter } from "./employees";
import { floorRouter } from "./floor";
import { inventoryRouter } from "./inventory";
import { loyaltyRouter } from "./loyalty";
import { manageRouter } from "./manage";
import { notificationRouter } from "./notification";
import { reportRouter } from "./report";
import { searchRouter } from "./search";
import { technicianRouter } from "./technician";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session.user,
  })),
  locations: publicProcedure.handler(() => {
    return db
      .select({ id: location.id, name: location.name })
      .from(location)
      .orderBy(asc(location.name));
  }),
  cashier: cashierRouter,
  discount: discountRouter,
  employees: employeesRouter,
  floor: floorRouter,
  inventory: inventoryRouter,
  loyalty: loyaltyRouter,
  manage: manageRouter,
  notifications: notificationRouter,
  report: reportRouter,
  search: searchRouter,
  technician: technicianRouter,
  dashboard: dashboardRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
