import type { RouterClient } from "@orpc/server";
import { Effect } from "effect";

import { protectedProcedure, publicProcedure } from "../index";
import { DbService, runEffect } from "../effect";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) =>
    runEffect(
      Effect.gen(function* () {
        yield* DbService;
        return {
          message: "This is private",
          user: context.session.user,
        };
      }),
    ),
  ),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
