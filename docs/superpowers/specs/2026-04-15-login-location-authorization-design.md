# Login location authorization — design

Date: 2026-04-15

## Problem

Employees may be shared across multiple locations. At login, an employee must choose the location they're working from so that data (inventory, jobs, customers, etc.) is scoped correctly. An employee must not be able to sign in to a location they are not assigned to.

The current implementation:

- `user.locationId` is a single text column — a user can only "belong" to one location.
- The location selector on the login forms (`email-login-form.tsx`, `staff-login-form.tsx`) sets a cookie (`rim-genie-location`) via `document.cookie` after sign-in.
- No server-side authorization — any authenticated user can set the cookie to any location ID via devtools and gain scoped access they shouldn't have.

## Goals

1. Allow admins to assign an employee to **multiple** locations.
2. Require the employee to pick a location at login.
3. Enforce assignment server-side — a user cannot log in against a location they aren't assigned to.
4. Make the location scoping cookie tamper-resistant (HttpOnly, server-set).

## Non-goals

- Post-login location switcher (separate feature).
- Changes to how scoped queries read `locationId` from context (`createContext` continues to work unchanged).
- Backfill of historical `user.locationId` → `user_location` beyond a one-line migration script.

## Architecture

### Data model

New join table in `packages/db/src/schema/location.ts`:

```ts
export const userLocation = pgTable(
  "user_location",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.locationId] })],
);

export const userLocationRelations = relations(userLocation, ({ one }) => ({
  user: one(user, { fields: [userLocation.userId], references: [user.id] }),
  location: one(location, { fields: [userLocation.locationId], references: [location.id] }),
}));
```

Existing `user.locationId` column is **kept** as a "default/primary" location — a convenience for `createContext` fallback and for display — but is no longer authoritative for access control. The set of assigned locations is the source of truth.

A migration backfill populates `user_location` from every row where `user.locationId IS NOT NULL`:

```sql
INSERT INTO user_location (user_id, location_id)
SELECT id, location_id FROM "user" WHERE location_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Server-side enforcement

Better Auth `hooks.after` middleware, registered on the auth instance in `packages/auth/src/index.ts`, runs after the path `/sign-in/email` or `/sign-in/username`:

1. Reads the `x-rim-genie-location` header from the original request.
2. If header is missing → revoke the freshly created session, throw `APIError("BAD_REQUEST", "Location is required")`.
3. Reads the new session's user ID from `ctx.context.newSession`.
4. If the user's role is `admin` → accept any valid `locationId` (no assignment check; admins are cross-location).
5. Otherwise → query `user_location` for `(userId, locationId)`. If no row exists → revoke the session, throw `APIError("FORBIDDEN", "You are not assigned to this location")`.
6. On success → append `Set-Cookie: rim-genie-location=<id>; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000` to the response.

The session revocation on failure uses `auth.api.revokeSession({ body: { token: newSession.token }, headers: ctx.context.headers })`. Because Better Auth commits the session before running the `after` hook, we explicitly clean up when rejecting.

### Frontend — login forms

Both `email-login-form.tsx` and `staff-login-form.tsx`:

- Location selector becomes **required**. Add to the Zod schema:
  `locationId: z.string().min(1, m.validation_location_required())`.
- Move `locationId` into the form state (currently `useState`) so it participates in validation.
- On submit, pass the header via the Better Auth client's `fetchOptions`:

```ts
authClient.signIn.email(
  { email, password },
  {
    fetchOptions: { headers: { "x-rim-genie-location": locationId } },
    onSuccess: () => { navigate({ to: "/dashboard" }); toast.success(m.toast_signed_in()); },
    onError: (error) => toast.error(error.error.message || error.error.statusText),
  },
);
```

- **Delete** the client-side `setLocationCookie()` helper and its call — the cookie is now set by the server via `Set-Cookie`.
- Error messaging (e.g. "not assigned to this location") is surfaced by the existing `toast.error` branch.

### Frontend — employee admin modal

`employee-modal.tsx` converts the single-select `locationId` field into a multi-select `locationIds: string[]`:

- Use a popover with a checkbox list (or extend the existing `Select` component with a `multiple` mode — decided during implementation based on how cleanly it fits).
- Trigger displays: "Select locations" (placeholder) / single location name / "N locations".
- Submit sends `locationIds: string[]` instead of `locationId: string`.

### API — employees router

`packages/api/src/routers/employees.ts`:

- `create` input: add `locationIds: z.array(z.string()).optional().default([])`; remove `locationId`.
  After user creation, `INSERT` into `user_location` for each ID. Write the first selected ID to `user.locationId` as the default for backward-compat.
- `update` input: add `locationIds: z.array(z.string()).optional()`. Fetch the user's current assignments, diff against the incoming set, apply `INSERT`s and `DELETE`s. Update `user.locationId` to the first ID (or `null` if the set becomes empty).
- `list`: switch from the single `leftJoin(location, user.locationId)` to a grouped query that returns `locations: { id: string; name: string }[]` per user. Implementation: run the base user query, then a second query `select from user_location join location where userId IN (...)`, group in JS. Drop the `locationId` / `locationName` fields from the result.

### API — frontend consumers of `employees.list`

`employee-card.tsx` (and anything else reading `locationId`/`locationName` from the list result) updates to render the `locations` array — either as chips, a comma-separated string, or "N locations". Exact visual is a small UI call during implementation; this spec does not pin it.

## Error messages (new i18n keys)

- `validation_location_required` — "Please select a location" (login form client-side).
- `auth_location_not_assigned` — "You are not assigned to this location" (server-side).
- `auth_location_required` — "Location is required" (server-side, missing header).

## Testing

No test framework configured in the repo, so verification is manual:

1. Log in as admin (unrestricted) — any location works.
2. Create a non-admin employee assigned to locations A and B.
3. Log in as that employee with location A → succeeds, cookie set, `/dashboard` data scoped to A.
4. Log in as that employee with location C → fails with "not assigned" toast; no session created (verify via devtools → Application → Cookies).
5. Attempt to sign in without selecting a location → client-side validation blocks submit.
6. Attempt to bypass by deleting the header client-side → server returns 400.
7. Attempt to tamper with the cookie value post-login → cookie is `HttpOnly`, not settable via `document.cookie`.

## Rollout

1. Schema migration (new `user_location` table + backfill).
2. Deploy server changes (API + auth hooks).
3. Deploy frontend changes (login forms + employee modal + card).

No breaking change for existing users: their `user.locationId` is preserved, backfilled into `user_location`, so they remain assigned to at least the one location they had before.

## Decisions deferred to implementation

- Whether to extend the existing `Select` component with a multi-select mode, or introduce a new `MultiSelect` component, or use a popover + checkbox list. Resolved during implementation based on fit.
- Exact display of multiple locations on the employee card.
