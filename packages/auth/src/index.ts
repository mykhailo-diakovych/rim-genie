import { db } from "@rim-genie/db";
import * as schema from "@rim-genie/db/schema/auth";
import { env } from "@rim-genie/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { ac, admin, cashier, floorManager, inventoryClerk, technician } from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
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
