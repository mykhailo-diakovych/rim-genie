import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
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
    usernameClient(),
    adminClient({
      ac,
      roles: { admin, floorManager, cashier, technician, inventoryClerk },
    }),
  ],
});
