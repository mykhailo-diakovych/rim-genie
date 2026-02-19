import { Effect } from "effect";
import { z } from "zod";

import { userRoleEnum, user } from "@rim-genie/db/schema";
import { asc, eq } from "@rim-genie/db/utils";

import { adminProcedure } from "../index";
import { AuthService, DbService, runEffect } from "../effect";

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
  list: adminProcedure.handler(() =>
    runEffect(
      Effect.gen(function* () {
        const db = yield* DbService;
        return yield* Effect.promise(() => db.select().from(user).orderBy(asc(user.name)));
      }),
    ),
  ),

  create: adminProcedure.input(createEmployeeSchema).handler(({ input }) =>
    runEffect(
      Effect.gen(function* () {
        const auth = yield* AuthService;
        const newUser = yield* Effect.promise(() =>
          auth.api.createUser({
            body: {
              name: `${input.firstName} ${input.lastName}`,
              email: input.email,
              password: input.pin,
              role: input.role,
            },
          }),
        );
        return newUser;
      }),
    ),
  ),

  update: adminProcedure.input(updateEmployeeSchema).handler(({ input }) =>
    runEffect(
      Effect.gen(function* () {
        const db = yield* DbService;
        const [updated] = yield* Effect.promise(() =>
          db
            .update(user)
            .set({
              name: `${input.firstName} ${input.lastName}`,
              email: input.email,
              role: input.role,
            })
            .where(eq(user.id, input.id))
            .returning(),
        );
        return updated;
      }),
    ),
  ),

  resetPin: adminProcedure
    .input(z.object({ userId: z.string().min(1), newPin: pinField }))
    .handler(({ input, context }) =>
      runEffect(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          yield* Effect.promise(() =>
            auth.api.setUserPassword({
              body: { userId: input.userId, newPassword: input.newPin },
              headers: context.headers,
            }),
          );
          return { success: true };
        }),
      ),
    ),
};
