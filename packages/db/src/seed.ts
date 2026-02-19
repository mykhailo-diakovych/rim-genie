import { hashPassword } from "better-auth/crypto";

import { db } from "./index";
import { user, account } from "./schema/auth";

async function seed() {
  const existing = await db.select({ id: user.id }).from(user).limit(1);

  if (existing.length > 0) {
    console.log("Users already exist, skipping seed.");
    return;
  }

  const userId = crypto.randomUUID();
  const hashedPassword = await hashPassword("admin1234");

  await db.insert(user).values({
    id: userId,
    name: "System Admin",
    email: "admin@rimgenie.com",
    username: "admin",
    displayUsername: "admin",
    role: "admin",
    emailVerified: true,
  });

  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: hashedPassword,
  });

  console.log("Seeded admin user: admin / admin1234");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
