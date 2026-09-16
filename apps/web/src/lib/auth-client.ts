import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";

import {
  ac,
  admin,
  cashier,
  floorManager,
  inventoryClerk,
  technician,
} from "@rim-genie/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    // Declared literally so the browser bundle never imports the server auth module.
    inferAdditionalFields({
      user: { canAdjustPrices: { type: "boolean" } },
    }),
    usernameClient(),
    adminClient({
      ac,
      roles: { admin, floorManager, cashier, technician, inventoryClerk },
    }),
  ],
});
