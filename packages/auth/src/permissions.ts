import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  quote: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete"],
  job: ["create", "read", "update", "complete", "assign"],
  customer: ["create", "read", "update", "delete"],
  inventory: ["read", "verify"],
  report: ["read"],
  settings: ["read", "update"],
  staff: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const floorManager = ac.newRole({
  quote: ["create", "read", "update", "delete"],
  customer: ["create", "read", "update"],
  job: ["read"],
});

export const cashier = ac.newRole({
  quote: ["read"],
  invoice: ["create", "read", "update"],
  job: ["read", "assign"],
  customer: ["read"],
});

export const technician = ac.newRole({
  job: ["read", "update", "complete"],
});

export const inventoryClerk = ac.newRole({
  inventory: ["read", "verify"],
  job: ["read"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  quote: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete"],
  job: ["create", "read", "update", "complete", "assign"],
  customer: ["create", "read", "update", "delete"],
  inventory: ["read", "verify"],
  report: ["read"],
  settings: ["read", "update"],
  staff: ["create", "read", "update", "delete"],
});
