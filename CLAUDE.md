# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # start all apps (web on port 3001)
bun run build        # build all packages
bun run check-types  # TypeScript check across all packages
bun run check        # oxlint + oxfmt (lint + format fix)

# Database (Docker-backed Postgres on port 5439)
bun run db:start     # start Postgres container
bun run db:push      # apply schema changes directly
bun run db:generate  # generate migration files
bun run db:migrate   # run migrations
bun run db:studio    # open Drizzle Studio
bun run db:stop      # stop container
```

Environment: `apps/web/.env` (single env file, loaded by all packages including `packages/db/drizzle.config.ts`).

## Architecture

**Monorepo**: Turborepo + Bun workspaces. Apps in `apps/`, shared packages in `packages/`. Internal packages are imported as `@rim-genie/*`.

### Package Responsibilities

- **`apps/web`** — TanStack Start (React 19, SSR). File-based routing under `src/routes/`. Port 3001.
- **`packages/api`** — oRPC server. Exports procedure builders, the `appRouter`, and the Effect layer.
- **`packages/auth`** — Better Auth instance (email/password, Drizzle adapter, TanStack Start cookies plugin).
- **`packages/db`** — Drizzle ORM + Postgres. Schema in `src/schema/`. Config reads `../../apps/web/.env`.
- **`packages/env`** — `@t3-oss/env-core` validation. Exports `./server` (server vars) and `./web` (Vite-prefixed client vars).
- **`packages/config`** — Shared `tsconfig.base.json`.

### Request Lifecycle

1. Client calls `orpc.<procedure>.query()` via TanStack Query → fetches `/api/rpc`
2. `apps/web/src/routes/api/rpc/$.ts` handles the request with `RPCHandler` (and `OpenAPIHandler` for `/api/rpc/api-reference`)
3. `createContext({ req })` extracts the Better Auth session from request headers
4. Procedure runs — `publicProcedure` or `protectedProcedure` (middleware checks `context.session`)
5. Complex handlers use `runEffect(Effect.gen(...))` to access injected services
6. oRPC serializes the response; React Query caches it client-side

### Effect.ts Service Layer (`packages/api/src/effect/`)

Services are Context Tags; Layers provide implementations:

- `DbService` → `db` (Drizzle client)
- `AuthService` → `auth` (Better Auth instance)
- `AppLayer = Layer.mergeAll(DbLayer, AuthLayer)` → `AppRuntime = ManagedRuntime.make(AppLayer)`

Usage in a router handler:

```typescript
handler: () =>
  runEffect(
    Effect.gen(function* () {
      const db = yield* DbService;
      // ...
    }),
  );
```

Errors: throw `new ApiError("tag", "message")` inside effects → automatically converted to `ORPCError`.

### Adding a New API Procedure

1. Add the handler to `packages/api/src/routers/index.ts` using `publicProcedure` or `protectedProcedure`
2. Use `.input(z.object({...}))` for Zod validation (automatically exposed in OpenAPI)
3. The client picks up the new procedure automatically via shared `appRouter` type — no codegen needed

### Frontend Patterns

- **oRPC client**: `apps/web/src/utils/orpc.ts` — isomorphic (SSR uses `createRouterClient`, client uses `RPCLink`)
- **Auth client**: `apps/web/src/lib/auth-client.ts` — Better Auth browser client
- **Path alias**: `@/*` → `apps/web/src/*`
- **UI components**: Base UI (headless) in `src/components/ui/`. Theme tokens in `src/index.css` (OKLch color space, dark mode by default)
- **Notifications**: Sonner (`toast.*`) — wired into the QueryClient's `onError`

### Auth Routes

- `/api/auth/$` — Better Auth handler (GET + POST)
- `/api/rpc/$` — oRPC + OpenAPI handler
- Session is cookie-based (Better Auth handles tokens via `tanstackStartCookies()` plugin)

## Key Conventions

- **Package manager**: Bun only — never use npm/yarn/pnpm commands
- **Dependency pinning**: Major deps are pinned in root `package.json` `catalog:` — add new shared deps there
- **TypeScript**: Strict mode, `noUnusedLocals`, `noUnusedParameters` — all enforced
- **Linting**: `oxlint` (fast Rust-based linter). Run `bun run check` to fix.
- **No test framework configured** — there are no tests yet
