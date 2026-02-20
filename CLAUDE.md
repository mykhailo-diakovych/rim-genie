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
- **`packages/api`** — oRPC server. Exports procedure builders and the `appRouter`.
- **`packages/auth`** — Better Auth instance (email/password, Drizzle adapter, TanStack Start cookies plugin).
- **`packages/db`** — Drizzle ORM + Postgres. Schema in `src/schema/`. Config reads `../../apps/web/.env`.
- **`packages/env`** — `@t3-oss/env-core` validation. Exports `./server` (server vars) and `./web` (Vite-prefixed client vars).
- **`packages/config`** — Shared `tsconfig.base.json`.

### Request Lifecycle

1. Client calls `orpc.<procedure>.query()` via TanStack Query → fetches `/api/rpc`
2. `apps/web/src/routes/api/rpc/$.ts` handles the request with `RPCHandler` (and `OpenAPIHandler` for `/api/rpc/api-reference`)
3. `createContext({ req })` extracts the Better Auth session from request headers
4. Procedure runs — `publicProcedure` or `protectedProcedure` (middleware checks `context.session`)
5. Handler uses `db` (Drizzle) and `auth` (Better Auth) directly via imports
6. oRPC serializes the response; React Query caches it client-side

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

### Button Component (`src/components/ui/button.tsx`)

Uses CVA with two axes: `variant` (`default` | `outline` | `ghost`) × `color` (`default` | `destructive` | `success`). Built on `@base-ui/react/button`.

- **Navigation buttons must use `render` prop** — never use `onClick` + `navigate()` for route transitions. Use `<Button nativeButton={false} render={<Link to="..." />}>` instead. `nativeButton={false}` is required because Base UI expects a native `<button>` by default — without it, rendering as `<a>` causes console errors. This pattern renders a semantic `<a>` tag, enabling prefetching, right-click → open in new tab, and proper accessibility.
- **Icon sizing** — button auto-sizes child SVGs via `[&_svg:not([class*='size-'])]:size-4`. Do not add `className="size-4"` to icons unless overriding to a different size.
- **No hardcoded widths** — buttons should auto-size to content. Do not use `w-[72px]` etc.

### Tailwind — No Hardcoded Values

Before writing any arbitrary value (`text-[16px]`, `rounded-[12px]`, `bg-[#fafbfc]`), always check if a standard Tailwind class or project CSS variable already covers it:

- **Colors**: Use tokens from `index.css` (`text-body`, `text-label`, `bg-dialog`, `border-field-line`, etc.). Never hardcode hex/rgb — if a color is missing, add it as an oklch variable in `:root` + register in `@theme inline`.
- **Spacing / sizing**: Use the default scale (`p-3` = 12px, `gap-2` = 8px, `h-9` = 36px, `leading-5` = 20px).
- **Border radius**: Use token scale (`rounded-sm` = 6px, `rounded-md` = 8px, `rounded-lg` = 10px, `rounded-xl` = 14px). Never `rounded-[12px]`.
- **Shadows**: Use named shadows (`shadow-dialog`). Add new ones in `@theme inline` as `--shadow-*`.
- **Font size**: Use standard classes (`text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px). Never `text-[16px]`.

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
- **No unnecessary comments**: Do not add inline comments, JSDoc, or section dividers unless they explain non-obvious logic. Code should be self-documenting.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `.claude/tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `.claude/tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `.claude/tasks/todo.md`
6. **Capture Lessons**: Update `.claude/tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
