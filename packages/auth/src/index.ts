import { db } from "@rim-genie/db";
import * as schema from "@rim-genie/db/schema/auth";
import { env } from "@rim-genie/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { admin as adminPlugin } from "better-auth/plugins";
import { username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { ac, admin, cashier, floorManager, inventoryClerk, technician } from "./permissions";

const LOCATION_HEADER = "x-rim-genie-location";
const LOCATION_COOKIE = "rim-genie-location";
const LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function assertUserCanUseLocation(userId: string, role: string | null, locationId: string) {
  if (role === "admin") return;

  const assignment = await db.query.userLocation.findFirst({
    where: (ul, { and, eq }) => and(eq(ul.userId, userId), eq(ul.locationId, locationId)),
    columns: { userId: true },
  });

  if (!assignment) {
    throw new APIError("FORBIDDEN", { message: "You are not assigned to this location" });
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" && ctx.path !== "/sign-in/username") return;

      const newSession = ctx.context.newSession;
      if (!newSession) return;

      const locationId = ctx.headers?.get(LOCATION_HEADER);

      const reject = async (message: string, status: "BAD_REQUEST" | "FORBIDDEN") => {
        await ctx.context.internalAdapter.deleteSession(newSession.session.token);
        deleteSessionCookie(ctx);
        throw new APIError(status, { message });
      };

      if (!locationId) {
        await reject("Location is required", "BAD_REQUEST");
        return;
      }

      try {
        await assertUserCanUseLocation(
          newSession.user.id,
          (newSession.user as { role?: string | null }).role ?? null,
          locationId,
        );
      } catch (error) {
        if (error instanceof APIError) {
          await reject(error.body?.message ?? "Location not allowed", "FORBIDDEN");
        }
        throw error;
      }

      ctx.setCookie(LOCATION_COOKIE, locationId, {
        path: "/",
        sameSite: "lax",
        maxAge: LOCATION_COOKIE_MAX_AGE,
      });
    }),
  },
  plugins: [
    tanstackStartCookies(),
    username(),
    adminPlugin({
      ac,
      roles: {
        admin,
        floorManager,
        cashier,
        technician,
        inventoryClerk,
      },
    }),
  ],
});
