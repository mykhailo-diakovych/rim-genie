import { Effect } from "effect";
import { ORPCError } from "@orpc/server";
import { AppRuntime } from "./runtime";
import type { DbService, AuthService } from "./services";

export class ApiError extends Error {
  readonly _tag = "ApiError";
  constructor(
    readonly code: ConstructorParameters<typeof ORPCError>[0],
    message: string,
  ) {
    super(message);
  }
}

export async function runEffect<A>(
  effect: Effect.Effect<A, ApiError, DbService | AuthService>,
): Promise<A> {
  const handled: Effect.Effect<A, never, DbService | AuthService> = effect.pipe(
    Effect.catchTag("ApiError", (e): Effect.Effect<never, never, never> => {
      throw new ORPCError(e.code, { message: e.message });
    }),
  );
  return AppRuntime.runPromise(handled);
}
