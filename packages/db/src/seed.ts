import { hashPassword } from "better-auth/crypto";

import { db } from "./index";
import { user, account } from "./schema/auth";
import { customer, quote, quoteItem } from "./schema/floor";
import { invoice, invoiceItem, payment } from "./schema/invoice";
import { job } from "./schema/job";

async function seed() {
  const existing = await db.select({ id: user.id }).from(user).limit(1);

  if (existing.length > 0) {
    console.log("Users already exist, skipping seed.");
    return;
  }

  const hashedPassword = await hashPassword("admin1234");

  const adminId = crypto.randomUUID();
  const cashierId = crypto.randomUUID();
  const technicianId = crypto.randomUUID();
  const floorManagerId = crypto.randomUUID();

  await db.insert(user).values([
    {
      id: adminId,
      name: "System Admin",
      email: "admin@rimgenie.com",
      username: "admin",
      displayUsername: "admin",
      role: "admin",
      emailVerified: true,
    },
    {
      id: cashierId,
      name: "Jane Cashier",
      email: "cashier@rimgenie.com",
      username: "cashier",
      displayUsername: "cashier",
      role: "cashier",
      emailVerified: true,
    },
    {
      id: technicianId,
      name: "Bob Technician",
      email: "tech@rimgenie.com",
      username: "tech",
      displayUsername: "tech",
      role: "technician",
      emailVerified: true,
    },
    {
      id: floorManagerId,
      name: "Alice Floor",
      email: "floor@rimgenie.com",
      username: "floor",
      displayUsername: "floor",
      role: "floorManager",
      emailVerified: true,
    },
  ]);

  await db.insert(account).values([
    {
      id: crypto.randomUUID(),
      userId: adminId,
      accountId: adminId,
      providerId: "credential",
      password: hashedPassword,
    },
    {
      id: crypto.randomUUID(),
      userId: cashierId,
      accountId: cashierId,
      providerId: "credential",
      password: hashedPassword,
    },
    {
      id: crypto.randomUUID(),
      userId: technicianId,
      accountId: technicianId,
      providerId: "credential",
      password: hashedPassword,
    },
    {
      id: crypto.randomUUID(),
      userId: floorManagerId,
      accountId: floorManagerId,
      providerId: "credential",
      password: hashedPassword,
    },
  ]);

  console.log("Seeded 4 users (all password: admin1234)");

  const [vipCustomer] = await db
    .insert(customer)
    .values({
      name: "Carlos Rivera",
      phone: "555-0101",
      email: "carlos@example.com",
      isVip: true,
      discount: 10,
    })
    .returning();

  const [regularCustomer1] = await db
    .insert(customer)
    .values({
      name: "Sarah Johnson",
      phone: "555-0102",
      email: "sarah@example.com",
    })
    .returning();

  await db.insert(customer).values({
    name: "Mike Chen",
    phone: "555-0103",
  });

  console.log("Seeded 3 customers (1 VIP, 2 regular)");

  const [quote1] = await db
    .insert(quote)
    .values({
      customerId: vipCustomer!.id,
      createdById: floorManagerId,
      status: "completed",
      total: 35000,
    })
    .returning();

  const quoteItems1 = await db
    .insert(quoteItem)
    .values([
      {
        quoteId: quote1!.id,
        vehicleSize: "18",
        sideOfVehicle: "front-left",
        damageLevel: "moderate",
        quantity: 1,
        unitCost: 15000,
        jobTypes: [{ type: "bend-fix" as const }, { type: "crack-fix" as const }],
        description: "Front left rim - bent and cracked",
        sortOrder: 0,
      },
      {
        quoteId: quote1!.id,
        vehicleSize: "18",
        sideOfVehicle: "front-right",
        damageLevel: "minor",
        quantity: 1,
        unitCost: 10000,
        jobTypes: [{ type: "straighten" as const }],
        description: "Front right rim - slightly bent",
        sortOrder: 1,
      },
      {
        quoteId: quote1!.id,
        vehicleSize: "18",
        sideOfVehicle: "rear-left",
        damageLevel: "minor",
        quantity: 1,
        unitCost: 10000,
        jobTypes: [{ type: "straighten" as const }],
        description: "Rear left rim - minor damage",
        sortOrder: 2,
      },
    ])
    .returning();

  const [quote2] = await db
    .insert(quote)
    .values({
      customerId: regularCustomer1!.id,
      createdById: floorManagerId,
      status: "pending",
      total: 15000,
    })
    .returning();

  await db.insert(quoteItem).values({
    quoteId: quote2!.id,
    vehicleSize: "20",
    sideOfVehicle: "rear-right",
    damageLevel: "severe",
    quantity: 1,
    unitCost: 15000,
    jobTypes: [{ type: "reconstruct" as const }],
    description: "Rear right rim - needs full reconstruction",
    sortOrder: 0,
  });

  console.log("Seeded 2 quotes (1 completed with 3 items, 1 pending with 1 item)");

  const subtotal = 35000;
  const discountAmount = Math.round((subtotal * 10) / 100);
  const total = subtotal - discountAmount;

  const [inv1] = await db
    .insert(invoice)
    .values({
      quoteId: quote1!.id,
      customerId: vipCustomer!.id,
      status: "partially_paid",
      subtotal,
      discount: discountAmount,
      tax: 0,
      total,
      createdById: cashierId,
    })
    .returning();

  const invoiceItems = await db
    .insert(invoiceItem)
    .values(
      quoteItems1.map((item) => ({
        invoiceId: inv1!.id,
        vehicleSize: item.vehicleSize,
        sideOfVehicle: item.sideOfVehicle,
        damageLevel: item.damageLevel,
        quantity: item.quantity,
        unitCost: item.unitCost,
        jobTypes: item.jobTypes,
        description: item.description,
        comments: item.comments,
        sortOrder: item.sortOrder,
      })),
    )
    .returning();

  console.log(`Seeded 1 invoice (#${inv1!.invoiceNumber}, total: $${(total / 100).toFixed(2)})`);

  await db.insert(payment).values({
    invoiceId: inv1!.id,
    amount: 20000,
    mode: "cash",
    receivedById: cashierId,
  });

  console.log("Seeded 1 payment ($200.00 cash)");

  await db.insert(job).values([
    {
      invoiceId: inv1!.id,
      invoiceItemId: invoiceItems[0]!.id,
      technicianId,
      status: "accepted",
      acceptedAt: new Date(),
    },
    {
      invoiceId: inv1!.id,
      invoiceItemId: invoiceItems[1]!.id,
      status: "pending",
    },
  ]);

  console.log("Seeded 2 jobs (1 accepted, 1 pending)");
  console.log("\nSeed complete!");
  console.log("Login credentials (all users): password = admin1234");
  console.log("  admin    → admin@rimgenie.com");
  console.log("  cashier  → cashier@rimgenie.com");
  console.log("  tech     → tech@rimgenie.com");
  console.log("  floor    → floor@rimgenie.com");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
