import "dotenv/config";

import { auth } from "./index";

async function seed() {
  const existingUsers = await auth.api.listUsers({
    query: { limit: 1 },
  });

  if (existingUsers.users.length > 0) {
    console.log("Users already exist, skipping seed.");
    return;
  }

  await auth.api.createUser({
    body: {
      name: "System Admin",
      email: "admin@rimgenie.com",
      password: "admin1234",
      role: "admin",
      data: {
        username: "admin",
      },
    },
  });

  console.log("Seeded admin user: admin / admin1234");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
