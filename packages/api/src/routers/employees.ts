import { z } from "zod";

import { auth } from "@rim-genie/auth";
import { db } from "@rim-genie/db";
import { userRoleEnum, user } from "@rim-genie/db/schema";
import { asc, eq } from "drizzle-orm";

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
    return db.select().from(user).orderBy(asc(user.name));
  }),

  create: adminProcedure.input(createEmployeeSchema).handler(({ input }) => {
    return auth.api.createUser({
      body: {
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        password: input.pin,
        role: input.role,
      },
    });
  }),

  update: adminProcedure.input(updateEmployeeSchema).handler(async ({ input }) => {
    const [updated] = await db
      .update(user)
      .set({
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        role: input.role,
      })
      .where(eq(user.id, input.id))
      .returning();
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
