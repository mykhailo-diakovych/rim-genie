import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { auth } from "@rim-genie/auth";
import { db } from "@rim-genie/db";
import { userRoleEnum, user } from "@rim-genie/db/schema";
import { desc, eq, and, ne } from "drizzle-orm";

import { adminProcedure } from "../index";

const pinField = z.string().length(6).regex(/^\d+$/);

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  pin: pinField,
  role: z.enum(userRoleEnum.enumValues),
});

const updateEmployeeSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  role: z.enum(userRoleEnum.enumValues),
});

export const employeesRouter = {
  list: adminProcedure.handler(() => {
    return db.select().from(user).orderBy(desc(user.createdAt));
  }),

  create: adminProcedure.input(createEmployeeSchema).handler(async ({ input }) => {
    try {
      return await auth.api.createUser({
        body: {
          name: `${input.firstName} ${input.lastName}`,
          email: input.email,
          password: input.pin,
          role: input.role,
        },
      });
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
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, input.email), ne(user.id, input.id)));
    if (existing.length > 0) {
      throw new ORPCError("CONFLICT", { message: "A user with this email already exists" });
    }

    const [updated] = await db
      .update(user)
      .set({
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        role: input.role,
      })
      .where(eq(user.id, input.id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Employee not found" });
    }

    return updated;
  }),

  resetPin: adminProcedure
    .input(z.object({ userId: z.string().min(1), newPin: pinField }))
    .handler(async ({ input, context }) => {
      await auth.api.setUserPassword({
        body: { userId: input.userId, newPassword: input.newPin },
        headers: context.headers,
      });
      return { success: true };
    }),
};
