# Rim Genie — Implementation Status & Plan

> Updated: 2026-02-27 | Based on `docs/REQUIREMENTS.md` + full codebase audit

---

## Part 1: Current Implementation Review

### Infrastructure (Complete)

- [x] Monorepo: Turborepo + Bun workspaces (7 packages)
- [x] Frontend: TanStack Start (React 19, Vite 8 beta, SSR), port 3001
- [x] API: oRPC with type-safe procedures + OpenAPI docs (7 domain routers + healthCheck)
- [x] Auth: Better Auth (email/password, cookie sessions, username plugin, admin plugin)
- [x] Database: PostgreSQL + Drizzle ORM with migrations (8 schema modules, Docker on port 5439)
- [x] Role-based access control: 5 roles (admin, floorManager, cashier, technician, inventoryClerk) with granular resource/action permissions
- [x] Environment validation via `@t3-oss/env-core` (server + web entry points)
- [x] UI: shadcn-style components on Base UI, Tailwind v4, dark mode (OKLch color tokens)
- [x] Role-specific procedure builders: `adminProcedure`, `floorManagerProcedure`, `cashierProcedure`, `technicianProcedure`, `inventoryClerkProcedure`
- [x] Frontend route guards: centralized `requireRoles()` + `hasRouteAccess()` in `route-permissions.ts`, `beforeLoad` guards on all role-restricted routes, sidebar filtered by role

### Authentication Module — §2.6 (Partially Complete)

- [x] Email/password login (Better Auth, minPasswordLength: 6)
- [ ] Staff PIN-based login — **UI exists** (`StaffLoginForm` with PIN input) but **shows "coming soon" toast on submit; no backend PIN auth endpoint**
- [x] Role-based dashboards (sidebar filters by role via `hasRouteAccess`, `beforeLoad` guards redirect unauthorized users to `/dashboard`)
- [x] Session management (cookie-based via `tanstackStartCookies()` plugin, SSR-compatible)
- [x] Username-only login support (Better Auth username plugin enabled)
- [ ] Authorization before any change/deletion (system-wide audit log — not implemented; no `audit_log` table)

### Floor Manager Module — §2.1 (Mostly Complete)

**Done:**

- [x] Customer search by phone and name (`floor.customers.search` — ILIKE, up to 20 results)
- [x] Create/edit customer profiles (name, phone, email, birthday day/month, VIP, discount, communication preference)
- [x] VIP flag + discount percentage on customer profile
- [x] Generate quotes (create quote → add line items with job types via `QuoteGeneratorSheet`)
- [x] Quote PDF generation (`/api/quotes/{quoteId}/pdf` endpoint, React PDF renderer)
- [x] Quote list with view/print/delete actions
- [x] Quote editor with items table, comments, totals, inline discount field
- [x] Search by invoice number (`floor.ts` joins invoice table for ILIKE search)
- [x] Default phone prefix `+1 876` (`customer-modal.tsx` has `PHONE_PREFIX`, `stripPhonePrefix()`)
- [x] Pricing by inches for welding/reconstruction (`quote-generator-sheet.tsx` welding tab, `inches * unitCost`)
- [x] VIP auto-discount application at quote time (`floor.ts` checks `isVip && discount` at creation)
- [x] Manual discount input on quote (`$quoteId.tsx` editable discount field, calls `quotes.update`)
- [x] Quote → Invoice conversion happens automatically on save when items exist (backend `syncInvoiceFromQuote`); toast shows "Quote saved and sent to cashier"
- [x] `quotes.update` and `quotes.delete` hardened to `floorManagerProcedure`
- [x] Customer detail page with quotes section showing status badges (draft=gray, pending=blue, in_progress=orange, completed=green)
- [x] Customer profile communication preference toggle (SMS/Email, persisted to DB via `communicationPreference` column)
- [x] Customer profile "Add Quote" creates quote directly and navigates to editor (skips customer search step)
- [x] Customer profile "Latest Jobs" section shows real job data from invoices→jobs (with job-specific statuses: pending/accepted/in_progress/completed)
- [x] Customer profile job numbers link to quote detail page
- [x] Customer deletion with cascading delete (quotes, invoices, payments, jobs)

**Not Done:**

- [ ] Explicit "Send to Cashier" button — conversion is implicit on save (no user-visible button/confirmation)
- [ ] Quote editor read-only mode for completed quotes — UI remains fully editable regardless of status
- [ ] Status badges on quote list page — status field is available but not rendered in `QuoteCard`
- [ ] Send quote via email (Resend integration — no email infra yet)
- [ ] Send quote via SMS (external API — no SMS infra yet)
- [ ] Electronic quote viewer (public SSR page via link — no public routes)
- [ ] Print job label tag (rack identifier — `jobRack` field exists in schema but no print template)

### Cashier Module — §2.2 (Backend Complete, Frontend Complete)

**Done:**

- [x] Invoice schema (invoice, invoiceItem, payment tables in DB)
- [x] Invoice API — full CRUD: list (with status/date/search filters, pagination), get, createFromQuote, update, delete
- [x] Payment API — record (with balance validation + auto-status recalculation), list
- [x] "Send to Technician" API — cashier-only role guard, creates jobs from invoice items, prevents duplicates
- [x] Page with tabbed invoice list wired to real API (Unpaid / Partially Paid / Paid)
- [x] Tab counts from real API totals
- [x] Delete invoice wired to API mutation (validates no payments/jobs exist)
- [x] Loading skeleton state
- [x] Money formatted from cents to dollars, dates from Date objects
- [x] Invoice detail view (`$invoiceId/index.tsx` — items table, totals, payments, customer info, company address)
- [x] Payment recording checkout page (`$invoiceId/checkout.tsx` — 5 payment methods, cash denomination breakdown, multi-payment support)
- [x] "Send to Technician" button on invoice detail page (wired to `cashier.jobs.sendToTechnician`)
- [x] "To Technician" button shows "Sent to Technician" (disabled) when jobs exist + job status summary bar (pending/accepted/in_progress/completed counts)
- [x] Date filter wired to API (Last 7/30/90 days, All time)
- [x] Print receipt via `window.print()` with print CSS
- [x] Discount + notes persisted from checkout (`handleConfirm()` calls `invoices.update` before recording payments)
- [x] Invoice detail shows notes, discount row, tax row in totals section
- [x] Payment history table on invoice detail (Date, Method, Amount, Reference, Received By)
- [x] Storage fee notice visible during print (print-friendly styles)
- [x] `jobs` Drizzle relation added to `invoiceRelations`, included in `invoices.get` API response

**Not Done:**

- [ ] E-receipt via email/SMS (depends on notification infra — Phase 4)
- [ ] Job completion notification to cashier (depends on notification infra — Phase 4)
- [ ] Outstanding payment auto-reminder to customer (depends on notification infra — Phase 4)

### Technician Module — §2.3 (Backend Complete, Frontend Mostly Complete)

**Done:**

- [x] Job schema (job table in DB with full relations, status enum: pending/accepted/in_progress/completed)
- [x] Job API — list (with status/technician filters), get, accept, complete, setDueDate, addNote
- [x] Job API — reverse (resets job to pending, clears technician/dates, appends `[REVERSED]:` reason to notes)
- [x] Job API — verifyPin (validates user PIN against password hash via better-auth crypto)
- [x] Technicians list API — returns `{id, name}[]` for dropdowns
- [x] Page with tabs wired to real API via `useJobs()` hook (New, Assign, In Progress, Completed)
- [x] Jobs grouped by invoiceId client-side (one card per invoice)
- [x] Tab categorization: per-job status categorization (each job individually sorted into Assign/In Progress/Completed, then grouped by invoice — same invoice can appear in multiple tabs)
- [x] Accept job dialog: dynamic technician dropdown from API, due date (Today/Tomorrow/In a week), PIN verification, overnight flag auto-set
- [x] Complete job dialog: tech code verification via `verifyPin` (verifies assigned technician's PIN), notes saved via `addNote`
- [x] Reverse job dialog: wired to `reverse` API with reason + PIN verification (verifies assigned technician's PIN); "Reverse all" filters out pending jobs; per-row Reverse hidden for pending jobs
- [x] Detail views (3 variants: assign, job, completed) display real job data from invoiceItem relations; detail view derives group from live query data (no stale snapshots), auto-closes when group disappears after reversal
- [x] Cache invalidation on mutations, toast feedback
- [x] Filter row wired: owner filter ("All"/"Mine") passes `technicianId` to API, date filter (Today/This week/This month) filters client-side
- [x] Filter state lifted to page level, shared across all tabs

**Partially Done:**

- [ ] Upload proof-of-work video — `UploadProofsDialog` UI component exists (file input, notes, before/after radio), `proofVideoUrl` DB column exists, but **dialog closes without any API call**; no upload endpoint or storage integration

**Not Done:**

- [ ] Auto-notify customer on completion (SMS + email — depends on Phase 4)
- [ ] Notify cashier on job completion (in-app — depends on Phase 4)

### Inventory Module — §2.4 (Backend Complete, Frontend Partially Complete)

**Done:**

- [x] Page with overnight job cards wired to real API
- [x] Notes modal for pickup/overnight/missing actions (wired to `markPickup`/`markMissing`/`markOvernight` API)
- [x] Inventory record schema (`inventoryRecord` table with EOD/SOD types, discrepancy tracking, unique constraint on type+date)
- [x] Inventory API — jobs: list (with status/overnight filters), unfinished, markPickup, markMissing, markOvernight
- [x] Inventory API — records: createEOD, createSOD (with auto-discrepancy detection), list, latest
- [x] Discrepancy flagging and admin notification (auto-detects mismatch in `createSOD` → dispatches in-app notification to all admins)
- [x] Track all overnight jobs (`isOvernight` flag on jobs, `jobs.unfinished` endpoint)
- [x] SOD form component (compares with latest EOD, client-side discrepancy preview, explanation field)
- [x] Frontend hooks: useOvernightJobs, useUnfinishedJobs, useInventoryRecords, useLatestRecords

**Not Done:**

- [ ] EOD form frontend — backend `records.createEOD` API exists but **no UI form** to submit EOD records
- [ ] Inventory records history view — no page to view past EOD/SOD records or filter by discrepancy
- [ ] Tab navigation — `TAB_CONFIG` defines tabs (overnight, eod, sod, history) in types.ts but **not wired to UI**

### Admin Module — §2.5 (Partially Complete)

**Done:**

- [x] Service catalog CRUD (rim + general types, vehicle types, sizes, costs) — `manage.ts` router + `/manage` page with tabs, search, pagination
- [x] Employee management (create, edit, reset PIN, role assignment) — `employees.ts` router + `/employees` page with cards, modals
- [x] Reset PIN requires old PIN verification (backend verifies hash via `verifyPassword` before allowing change)
- [x] Auto-generated Employee ID (`employees.generateId` procedure — `firstname.lastname` slug with numeric suffix if taken, debounced auto-fill in create modal)
- [x] Employee deactivation & deletion flow — deactivate (ban), activate (unban), delete (requires deactivated first) with confirmation modals, visual "Deactivated" badge + dimmed card styling
- [x] Dashboard with metrics, team activity, attention items (real DB aggregation) — `dashboard.ts` router + `/dashboard` page with sparkline charts, period selector (Today/Week/Month)
- [x] VIP discount auto-applied at quote creation time (in `floor.ts` — checks `isVip && discount`)
- [x] VIP badge on customer list cards + VIP status on customer profile
- [x] Customer deletion with cascading validation (deletes related quotes, invoices, payments, jobs in transaction)

**Not Done:**

- [ ] VIP client management UI (dedicated upgrade/downgrade actions — currently only editable via customer edit modal)
- [ ] Discount approval workflow (Floor Manager requests → Admin approves — notification types exist in schema but no workflow)
- [ ] Clock in/out attendance tracking (no `attendance` table)
- [ ] Expense recording (no `expense` table)
- [ ] Admin-specific invoice/payment views (admins can access cashier module but no dedicated admin financial view)
- [ ] Daily reports (expenses, revenue, quotes, invoices — dashboard shows live metrics but no formal report generation)
- [ ] Multi-site support (no `site` table, no location scoping)
- [ ] Admin job monitoring dashboard (technician module exists but no admin-only job reassignment/monitoring view)

### Loyalty / Birthday Module — §2.7 (Not Started)

- [ ] Track customer purchase frequency
- [ ] Surface loyalty data in customer profiles across modules
- [ ] Admin-configurable loyalty thresholds and benefits

### Digital Disclaimer / Signature — §2.8 (Partially Complete)

- [x] `termsSignature` DB table (`terms_signature` — 1:1 with quote via unique constraint on `quoteId`, cascade delete, stores base64 signature data URL)
- [x] API procedures: `floor.termsSignature.sign` (validates quote, prevents duplicates, links to session user) + `floor.termsSignature.getByQuoteId`
- [x] Terms page accepts `quoteId` search param, persists signature via mutation, shows "already signed" state on revisit
- [x] Signature pad capture (`signature_pad` integrated in `SignatureModal`, base64 data URL passed to API)
- [x] 7 disclaimer sections with accept-all, per-section expand/accept
- [ ] Save disclaimer under customer profile (currently linked to quote, not customer)
- [ ] Interactive tablet disclaimer with section-based signing (individual section signatures — current flow is single signature after accepting all)

### Notifications & Communication (Partially Complete)

**Done:**

- [x] Notification schema (`notification` table with 5 type enum values, recipient FK, read status, reference linking)
- [x] In-app notification system (API: list, unreadCount, markRead, markAllRead — `protectedProcedure`)
- [x] Notification service (create, notifyAdmins, listForUser, unreadCount, markRead, markAllRead — Effect-based)
- [x] Inventory discrepancy → admin notification trigger (wired in `createSOD` service)

**Not Done:**

- [ ] SMS integration (external API endpoint)
- [ ] Email integration (Resend — not configured or wired)
- [ ] Notification bell UI in header with unread count (header has logo, global search command palette, user info, logout — no bell)
- [ ] Notification dropdown/panel
- [ ] Remaining notification triggers: quote sent, job completed, payment reminder, discount request/approval

### Cross-Cutting Concerns (Partially Complete)

- [x] Global search / command palette (Cmd/Ctrl+K) — `cmdk` + `@base-ui/react/dialog`, `search.global` oRPC procedure with 4 parallel DB queries (customers, quotes, invoices, employees), debounced input, grouped results, keyboard nav, navigation on select
- [ ] Real-time updates (WebSocket/SSE)
- [ ] Video/file storage (Azure Blob Storage)
- [ ] Print optimization (`@media print` CSS — basic print styles exist for receipt but not comprehensive)
- [ ] Audit log system (no `audit_log` table, no change history tracking)
- [ ] Soft deletes (hard deletes only throughout)

---

## Part 2: Implementation Plan (Recommended Order)

### Phase 1: Core Data Layer ✅ COMPLETE

> ~~Priority: **Critical**~~ — Done

- [x] Step 1.1: Invoice, InvoiceItem, Payment tables — `packages/db/src/schema/invoice.ts`
- [x] Step 1.2: Job table — `packages/db/src/schema/job.ts`
- [x] Step 1.3: Notification schema — `packages/db/src/schema/notification.ts`
- [x] Seed data with users, quotes, invoices, jobs
- [ ] Step 1.4: Site schema (multi-site) — **deferred to Phase 6**

Note: Invoice status uses `unpaid/partially_paid/paid` (no `draft`/`overdue`). Job table lacks `acceptedById`/`completedById` separate columns (uses `technicianId` only).

---

### Phase 2: Cashier Module ✅ COMPLETE (except email/SMS — Phase 4)

> ~~Priority: **High**~~ — Done

- [x] Step 2.1: Invoice API — all 5 procedures implemented
- [x] Step 2.2: Payment API — record + list implemented, auto-status recalculation works
- [x] Step 2.3: "Send to Technician" API — cashier-only guard, creates jobs from invoice items
- [x] Step 2.4a: Invoice list with real data (tabs, counts, delete, pagination, search)
- [x] Step 2.4b: Invoice detail view (View button → `$invoiceId/index.tsx`)
- [x] Step 2.4c: Payment recording form (Pay button → `$invoiceId/checkout.tsx`)
- [x] Step 2.4d: Quote → Invoice conversion (automatic via `syncInvoiceFromQuote` on save)
- [x] Step 2.4e: "Send to Technician" button on invoice detail page (with job-aware disabled state + status summary bar)
- [x] Step 2.4f-print: Print receipt via `window.print()` with print CSS
- [ ] Step 2.4f-digital: E-receipt via email/SMS (depends on Phase 4)
- [x] Step 2.4g: Date filter wired to API
- [x] Step 2.4h: Discount + notes checkout wiring, invoice detail display (notes, discount/tax rows, payment history table)
- [x] Step 2.4i: Storage fee notice print-visible

---

### Phase 3: Technician Module ✅ Backend Complete, ✅ Frontend Mostly Complete

> Priority: **High**

- [x] Step 3.1: Job API — list, get, accept, complete, setDueDate, addNote, reverse, verifyPin, technicians.list
- [x] Step 3.3a: Frontend wired to real data (list, grouping, accept, complete mutations)
- [x] Step 3.3b: Technician dropdown from `technicians.list` API
- [x] Step 3.3c: Due date picker wired to `setDueDate` API (Today/Tomorrow/In a week)
- [x] Step 3.3d: PIN/employee code validation via `verifyPin` endpoint (accept, complete, reverse dialogs)
- [x] Step 3.3e: Filter by owner (All/Mine) + date (Today/This week/This month)
- [x] Step 3.3f: Reverse job dialog wired to `reverse` API with reason + PIN, callers pass real job IDs
- [ ] Step 3.1b: `technician.jobs.uploadProof` API endpoint (UI dialog exists but no backend call)
- [ ] Step 3.2: Video upload (Azure Blob Storage integration)

---

### Phase 4: Notification System (Partially Complete)

> Priority: **High** — Multiple modules depend on notifications

#### Step 4.1: In-App Notifications

- [x] Notification schema (DB table — `notification` with type enum, recipient FK, read status, reference linking)
- [x] Notification API (list, unreadCount, markRead, markAllRead — `protectedProcedure`)
- [x] Notification service (create, notifyAdmins, listForUser, unreadCount, markRead, markAllRead)
- [ ] Notification bell in header with unread count
- [ ] Notification dropdown/panel

#### Step 4.2: Email Integration (Resend)

- [ ] Configure Resend transactional email
- [ ] Quote email template
- [ ] Receipt email template
- [ ] Payment reminder template

#### Step 4.3: SMS Integration

- [ ] Integrate with provided SMS API endpoint (or Twilio)
- [ ] Quote SMS with link
- [ ] Job completion SMS
- [ ] Payment reminder SMS

#### Step 4.4: Notification Triggers

- [x] Inventory discrepancy → admin notification (wired in `createSOD` service)
- [ ] Quote sent → customer notification
- [ ] Job completed → customer SMS + cashier in-app
- [ ] Payment reminder → customer
- [ ] Discount request → admin
- [ ] Discount approved/rejected → floor manager

---

### Phase 5: Inventory Module — Backend ✅ COMPLETE, Frontend Partially Complete

> Priority: **Medium**

- [x] Step 5.1: Inventory API — `jobs.list`, `jobs.unfinished`, `jobs.markPickup`, `jobs.markMissing`, `jobs.markOvernight`
- [x] Step 5.1: Inventory records API — `records.createEOD`, `records.createSOD`, `records.list`, `records.latest`
- [x] Step 5.1: Discrepancy auto-detection in `createSOD` + admin notification dispatch
- [x] Step 5.2: Frontend overnight jobs view with action dialogs (pickup/overnight/missing)
- [x] Step 5.2: SOD reconciliation form with previous EOD comparison and discrepancy alert
- [ ] Step 5.3: EOD form frontend (backend API exists, no UI)
- [ ] Step 5.4: Inventory records history/audit page
- [ ] Step 5.5: Tab navigation for overnight/eod/sod/history views

---

### Phase 6: Admin Enhancements (Not Started)

> Priority: **Medium**

#### Step 6.1: Financial Views

- [ ] Admin-specific invoice and payment views
- [ ] Expense recording (new `expense` table + CRUD)
- [ ] Daily reports: revenue, expenses, quotes, invoices
- [x] Dashboard metrics from real DB aggregation queries

#### Step 6.2: Workforce

- [ ] Clock in/out attendance tracking (new `attendance` table)
- [ ] Attendance reports

#### Step 6.3: VIP & Discounts

- [ ] VIP management UI (dedicated upgrade/downgrade actions beyond edit modal)
- [ ] Discount approval workflow (request → admin approval → apply)

#### Step 6.4: Job Monitoring Dashboard

- [ ] Admin job monitoring/reassignment dashboard
- [ ] Multi-site dashboard switching
- [ ] Site schema (deferred from Phase 1.4)

---

### Phase 7: Floor Manager Enhancements (Mostly Complete)

> Priority: **Medium**

- [x] Default phone prefix `+1 876` in customer forms
- [x] Search by invoice number
- [x] Pricing by inches for welding/reconstruction services
- [x] VIP auto-discount at quote creation
- [x] Manual discount input on quote
- [x] Quote → Invoice conversion on save (automatic when items exist)
- [ ] Explicit "Send to Cashier" button with confirmation dialog
- [ ] Quote read-only mode for completed quotes (lock editing)
- [ ] Status badges on quote list page
- [ ] Print job label tag
- [ ] Send quote via email/SMS with electronic quote link (depends on Phase 4)
- [ ] Public electronic quote viewer page (SSR)
- [x] Staff PIN login implementation (backend auth endpoint needed)

---

### Phase 8: Real-Time Updates (Not Started)

> Priority: **Medium** — Addresses Bug #1 from legacy system

- [ ] WebSocket or SSE server (Azure Web PubSub or custom)
- [ ] Quote created → appears in cashier queue instantly
- [ ] Job status changes → reflected in all views
- [ ] Notification push to connected clients

---

### Phase 9: Print & Receipt Optimization (Partially Done)

> Priority: **Low-Medium**

- [ ] `@media print` stylesheets for receipts, invoices, job tags
- [ ] Receipt layout: 8+ services per page, address beside logo
- [x] Storage fee notice on all receipts (print-friendly border/bg styles)
- [ ] Job label tag print format

---

### Phase 10: Loyalty Program — §2.7 (Not Started)

> Priority: **Low**

- [ ] Purchase frequency tracking
- [ ] Loyalty data in customer profiles
- [ ] Admin-configurable thresholds

---

### Phase 11: Digital Disclaimer / Signature — §2.8 (Partially Complete)

> Priority: **Low** (explicitly Stage 3)

- [x] `termsSignature` table in `packages/db/src/schema/floor.ts` (1:1 with quote, unique constraint, relations)
- [x] `floor.termsSignature.sign` + `floor.termsSignature.getByQuoteId` API procedures
- [x] Terms page (`/terms?quoteId=...`) — accepts quoteId param, mutation to persist, "already signed" state, error state for missing quoteId
- [x] 7 disclaimer sections with expand/accept UX + signature pad capture
- [ ] Save disclaimer under customer profile (currently per-quote)
- [ ] Section-based individual signing (current: single signature after accepting all sections)

---

## Part 3: Architecture Notes

### Resolved Design Decisions

1. **Invoice items**: ✅ Decided — Copy from quote items (snapshot). Implemented in `createFromQuote` service + `syncInvoiceFromQuote`.
2. **"Send to Technician" enforcement**: ✅ Backend role-guard via `cashierProcedure`. Floor Manager UI has no send buttons — quote-to-invoice conversion is automatic on save.
3. **VIP discount**: ✅ Auto-applied at quote creation time (`floor.ts` checks `isVip && discount`) and carried through to invoice conversion.

### Remaining Design Decisions

1. **Multi-site**: Add `siteId` to all tables or use a junction? → Recommend FK on quote/invoice/job (Phase 6.4)
2. **Discount workflow**: Inline on invoice or separate approval entity? → Recommend separate `discountRequest` table for audit trail (Phase 6.3)
3. **PIN login**: Separate auth endpoint or reuse Better Auth password flow? → PIN stored as password in accounts table during employee creation; need dedicated verification route

### Technical Debt / Improvements

- ~~Technician, Cashier pages use hardcoded mock data~~ → ✅ Both now wired to real API
- ~~Accept dialog technician dropdown hardcoded~~ → ✅ Now loads from `technicians.list` API
- ~~QuoteGeneratorSheet uses ~15 manual useState calls~~ → ✅ Refactored to `@tanstack/react-form` with Zod schemas
- ~~Dashboard metrics use mock data~~ → ✅ Real DB aggregation via `dashboard.ts` router
- ~~Inventory page uses mock data~~ → ✅ Now wired to real API
- ~~Job grouping bug: entire invoice group moved tabs when one job accepted~~ → ✅ Fixed: per-job categorization before grouping by invoice
- ~~Stale detail view: technician detail view held snapshot of group data~~ → ✅ Fixed: stores invoiceId ref, derives group from live useJobs data, auto-closes on group disappearance
- ~~Reverse/complete dialogs verified logged-in user's PIN instead of assigned technician's~~ → ✅ Fixed: all dialogs now pass technician's userId to verifyPin
- ~~Reverse all included pending job IDs causing backend rejection~~ → ✅ Fixed: filters to non-pending jobs only; per-row Reverse hidden for pending
- ~~verifyPin filtered by providerId="credential" which could miss accounts~~ → ✅ Fixed: queries by userId only (matches resetPin pattern)
- ~~Customer profile communication toggle hardcoded to SMS~~ → ✅ Fixed: `communicationPreference` DB column + functional toggle with mutation
- ~~Customer profile "Add Quote" navigated to /floor/new-quote with ignored search param~~ → ✅ Fixed: directly creates quote via API and navigates to editor
- ~~Customer profile "Latest Jobs" showed filtered quotes instead of real jobs~~ → ✅ Fixed: `getById` includes invoices→jobs, UI shows actual job data with proper statuses
- ~~Customer profile job numbers were non-clickable styled spans~~ → ✅ Fixed: clickable buttons that navigate to quote detail page
- No real-time updates yet (polling could be interim via TanStack Query refetchInterval)
- No file upload infrastructure (Azure Blob Storage needed for proof-of-work videos)
- `acceptedById`/`completedById` audit columns missing from job table
- No audit log system (all mutations are fire-and-forget)
- No soft deletes anywhere (hard deletes with cascading throughout)
- Staff PIN login form exists but submits "coming soon" toast
- Inventory EOD form has no frontend (only SOD form exists)
- Upload proofs dialog has full UI but no backend integration

### Security Gaps to Address

- "Send to Technician" is backend-enforced ✅ (via `cashierProcedure`)
- ~~Frontend routes wide open — no `beforeLoad` guards on floor/cashier/technician/inventory~~ → ✅ All role-restricted routes now have `beforeLoad` guards via centralized `requireRoles()`; sidebar uses `hasRouteAccess()` to hide unauthorized nav items
- Authorization before changes/deletions (audit log system) — not implemented
- No soft deletes — accidental deletions are unrecoverable
- [x] Ban enforcement — admin can deactivate (ban) employees via `employees.deactivate`, reactivate via `employees.activate`, and delete (only if banned) via `employees.delete`; UI shows conditional actions based on `banned` state
