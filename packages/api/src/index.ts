import { ORPCError, os } from "@orpc/server";

import type { UserRole } from "@rim-genie/db/schema";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
      headers: context.headers,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireRole = (...roles: UserRole[]) =>
  protectedProcedure.use(async ({ context, next }) => {
    const userRole = (context.session.user as { role?: UserRole }).role;
    if (!userRole || !roles.includes(userRole)) {
      throw new ORPCError("FORBIDDEN");
    }
    return next({ context });
  });

export const adminProcedure = requireRole("admin");
export const floorManagerProcedure = requireRole("admin", "floorManager");
export const cashierProcedure = requireRole("admin", "cashier");
export const technicianProcedure = requireRole("admin", "technician");
export const inventoryClerkProcedure = requireRole("admin", "inventoryClerk");
