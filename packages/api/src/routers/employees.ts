import { randomBytes } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { auth } from "@rim-genie/auth";
import { hashPassword } from "@rim-genie/auth/crypto";
import { db } from "@rim-genie/db";
import { env } from "@rim-genie/env/server";
import {
  account,
  location,
  userLocation,
  userRoleEnum,
  user,
  verification,
} from "@rim-genie/db/schema";
import { desc, eq, and, ne, like, inArray, lt } from "drizzle-orm";

import { adminProcedure, publicProcedure } from "../index";
import * as EmailService from "../services/email.service";
import { createStaffInviteEmail } from "../emails/staff-invite-email";
import { runEffect } from "../services/run-effect";

const pinField = z.string().length(4).regex(/^\d+$/);

const employeeIdField = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/);

// Better Auth's username plugin lowercases on write and looks up with the same
// normalizer, but we set `username` with a direct db write (createUser does not
// take it), so we have to normalize here or sign-in silently fails to match.
// `displayUsername` keeps whatever casing the admin typed.
const normalizeUsername = (employeeId: string) => employeeId.toLowerCase();

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  employeeId: employeeIdField,
  pin: pinField,
  role: z.enum(userRoleEnum.enumValues),
  // Sign-in rejects any non-admin without a `userLocation` row, so an employee
  // created with no location is permanently locked out.
  locationIds: z.array(z.string().min(1)).min(1),
});

const updateEmployeeSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  employeeId: employeeIdField,
  role: z.enum(userRoleEnum.enumValues),
  // Optional on update (omit to leave assignments untouched), but never empty —
  // clearing every location would lock the employee out.
  locationIds: z.array(z.string().min(1)).min(1).optional(),
});

// ─── Staff invites ────────────────────────────────────────────────────────────
// Answers "how does a team member set their own PIN": they get an emailed link.
// Tokens live in Better Auth's generic `verification` table (identifier is
// indexed) under a namespaced identifier, so this needs no schema change.

const INVITE_PREFIX = "staff-invite:";
const INVITE_TTL_DAYS = 7;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  floorManager: "Floor Manager",
  cashier: "Cashier",
  technician: "Technician",
  inventoryClerk: "Inventory Clerk",
};

async function issueInviteToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  // One live invite per user: a resend must invalidate the previous link.
  await db.delete(verification).where(eq(verification.value, `${INVITE_PREFIX}${userId}`));
  // Opportunistically drop expired invites so the table does not grow forever.
  await db.delete(verification).where(lt(verification.expiresAt, new Date()));

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier: `${INVITE_PREFIX}${token}`,
    value: `${INVITE_PREFIX}${userId}`,
    expiresAt,
  });

  return token;
}

async function sendInvite(row: { id: string; name: string; email: string; username: string | null; role: string | null }) {
  const token = await issueInviteToken(row.id);
  const inviteUrl = `${env.BETTER_AUTH_URL}/set-pin?token=${token}`;

  await runEffect(
    EmailService.send({
      to: row.email,
      subject: "Set up your Rim Genie account",
      react: createStaffInviteEmail({
        name: row.name,
        employeeId: row.username ?? row.email,
        roleLabel: ROLE_LABELS[row.role ?? ""] ?? "Staff",
        inviteUrl,
        expiresInDays: INVITE_TTL_DAYS,
      }),
    }),
  );
}

async function resolveInvite(token: string) {
  const [row] = await db
    .select({ value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, `${INVITE_PREFIX}${token}`))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row.value.slice(INVITE_PREFIX.length);
}

async function setUserLocations(userId: string, locationIds: string[]) {
  await db.delete(userLocation).where(eq(userLocation.userId, userId));
  if (locationIds.length > 0) {
    await db
      .insert(userLocation)
      .values(locationIds.map((locationId) => ({ userId, locationId })))
      .onConflictDoNothing();
  }
  await db
    .update(user)
    .set({ locationId: locationIds[0] ?? null })
    .where(eq(user.id, userId));
}

export const employeesRouter = {
  list: adminProcedure.handler(async () => {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    if (users.length === 0) return [];

    const assignments = await db
      .select({
        userId: userLocation.userId,
        locationId: userLocation.locationId,
        locationName: location.name,
      })
      .from(userLocation)
      .innerJoin(location, eq(userLocation.locationId, location.id))
      .where(
        inArray(
          userLocation.userId,
          users.map((u) => u.id),
        ),
      );

    const byUser = new Map<string, { id: string; name: string }[]>();
    for (const row of assignments) {
      const list = byUser.get(row.userId) ?? [];
      list.push({ id: row.locationId, name: row.locationName });
      byUser.set(row.userId, list);
    }

    return users.map((u) => ({ ...u, locations: byUser.get(u.id) ?? [] }));
  }),

  create: adminProcedure.input(createEmployeeSchema).handler(async ({ input }) => {
    const normalizedUsername = normalizeUsername(input.employeeId);

    const existingUsername = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, normalizedUsername));
    if (existingUsername.length > 0) {
      throw new ORPCError("CONFLICT", { message: "A user with this Employee ID already exists" });
    }

    try {
      const created = await auth.api.createUser({
        body: {
          name: `${input.firstName} ${input.lastName}`,
          email: input.email,
          password: input.pin,
          role: input.role,
        },
      });

      await db
        .update(user)
        .set({ username: normalizedUsername, displayUsername: input.employeeId })
        .where(eq(user.id, created.user.id));
      await setUserLocations(created.user.id, input.locationIds);

      // The employee can sign in immediately with the PIN the admin set; the invite
      // lets them replace it with one only they know. A mail failure must not undo
      // an otherwise-created account, so it is reported, not thrown.
      let inviteSent = true;
      try {
        await sendInvite({
          id: created.user.id,
          name: `${input.firstName} ${input.lastName}`,
          email: input.email,
          username: normalizedUsername,
          role: input.role,
        });
      } catch {
        inviteSent = false;
      }

      return {
        ...created,
        inviteSent,
        user: {
          ...created.user,
          username: normalizedUsername,
          locationIds: input.locationIds,
        },
      };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already exists")) {
        throw new ORPCError("CONFLICT", { message: "A user with this email already exists" });
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create employee" });
    }
  }),

  update: adminProcedure.input(updateEmployeeSchema).handler(async ({ input }) => {
    const existingEmail = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, input.email), ne(user.id, input.id)));
    if (existingEmail.length > 0) {
      throw new ORPCError("CONFLICT", { message: "A user with this email already exists" });
    }

    const normalizedUsername = normalizeUsername(input.employeeId);

    const existingUsername = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.username, normalizedUsername), ne(user.id, input.id)));
    if (existingUsername.length > 0) {
      throw new ORPCError("CONFLICT", { message: "A user with this Employee ID already exists" });
    }

    const [updated] = await db
      .update(user)
      .set({
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        username: normalizedUsername,
        displayUsername: input.employeeId,
        role: input.role,
      })
      .where(eq(user.id, input.id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Employee not found" });
    }

    if (input.locationIds !== undefined) {
      await setUserLocations(input.id, input.locationIds);
    }

    return updated;
  }),

  resendInvite: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
        })
        .from(user)
        .where(eq(user.id, input.userId));

      if (!row) throw new ORPCError("NOT_FOUND", { message: "Employee not found" });
      await sendInvite(row);
      return { success: true };
    }),

  invite: {
    // Public: the recipient has no account access yet — the token is the credential.
    verify: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .handler(async ({ input }) => {
        const userId = await resolveInvite(input.token);
        if (!userId) return { valid: false as const };

        const [row] = await db
          .select({ name: user.name, username: user.username, banned: user.banned })
          .from(user)
          .where(eq(user.id, userId));

        if (!row || row.banned) return { valid: false as const };
        return { valid: true as const, name: row.name, employeeId: row.username ?? "" };
      }),

    setPin: publicProcedure
      .input(z.object({ token: z.string().min(1), pin: pinField }))
      .handler(async ({ input }) => {
        const userId = await resolveInvite(input.token);
        if (!userId) {
          throw new ORPCError("BAD_REQUEST", {
            message: "This invite link is invalid or has expired. Ask an administrator for a new one.",
          });
        }

        // Write straight to the credential account: `setUserPassword` is an admin
        // endpoint and the recipient is, by definition, not signed in.
        const [cred] = await db
          .select({ id: account.id })
          .from(account)
          .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

        if (!cred) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "This account cannot accept a PIN. Ask an administrator to reset it.",
          });
        }

        await db
          .update(account)
          .set({ password: await hashPassword(input.pin) })
          .where(eq(account.id, cred.id));

        // Single use.
        await db
          .delete(verification)
          .where(eq(verification.identifier, `${INVITE_PREFIX}${input.token}`));

        return { success: true };
      }),
  },

  resetPin: adminProcedure
    .input(z.object({ userId: z.string().min(1), newPin: pinField }))
    .handler(async ({ input, context }) => {
      await auth.api.setUserPassword({
        body: { userId: input.userId, newPassword: input.newPin },
        headers: context.headers,
      });
      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      await auth.api.banUser({
        body: { userId: input.userId },
        headers: context.headers,
      });
      return { success: true };
    }),

  activate: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .handler(async ({ input }) => {
      await db.update(user).set({ banned: false }).where(eq(user.id, input.userId));
      return { success: true };
    }),

  generateId: adminProcedure
    .input(z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }))
    .handler(async ({ input }) => {
      const base = `${input.firstName}.${input.lastName}`.toLowerCase().replace(/[^a-z0-9._]/g, "");

      if (!base || base === ".") {
        return { employeeId: "" };
      }

      const existing = await db
        .select({ username: user.username })
        .from(user)
        .where(like(user.username, `${base}%`));

      const taken = new Set(existing.map((r) => r.username));

      if (!taken.has(base)) return { employeeId: base };

      let suffix = 2;
      while (taken.has(`${base}${suffix}`)) suffix++;
      return { employeeId: `${base}${suffix}` };
    }),

  delete: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const [target] = await db
        .select({ banned: user.banned })
        .from(user)
        .where(eq(user.id, input.userId));
      if (!target?.banned) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Employee must be deactivated before deletion",
        });
      }
      await auth.api.removeUser({
        body: { userId: input.userId },
        headers: context.headers,
      });
      return { success: true };
    }),
};
