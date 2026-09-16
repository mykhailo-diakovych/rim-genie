import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";

import { db } from "@rim-genie/db";
import { user } from "@rim-genie/db/schema";
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

export const requireRole = (...roles: UserRole[]) =>
  protectedProcedure.use(async ({ context, next }) => {
    const userRole = context.session.user.role as UserRole | null | undefined;
    if (!userRole || !roles.includes(userRole)) {
      throw new ORPCError("FORBIDDEN");
    }
    return next({ context });
  });

// canAdjustPrices is re-read from the DB (not the session) so revocation is immediate.
export const priceAdjustProcedure = protectedProcedure.use(async ({ context, next }) => {
  if ((context.session.user.role as UserRole | null | undefined) === "admin") {
    return next({ context });
  }

  const [row] = await db
    .select({ canAdjustPrices: user.canAdjustPrices })
    .from(user)
    .where(eq(user.id, context.session.user.id))
    .limit(1);

  if (!row?.canAdjustPrices) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not permitted to adjust prices",
    });
  }

  return next({ context });
});

export const adminProcedure = requireRole("admin");
export const floorManagerProcedure = requireRole("admin", "floorManager");
export const cashierProcedure = requireRole("admin", "cashier");
export const technicianProcedure = requireRole("admin", "technician");
export const inventoryClerkProcedure = requireRole("admin", "inventoryClerk");
