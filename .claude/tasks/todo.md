# Rim Genie — Implementation Status & Plan

> Updated: 2026-02-24 | Based on `docs/REQUIREMENTS.md`

---

## Part 1: Current Implementation Review

### Infrastructure (Complete)

- [x] Monorepo: Turborepo + Bun workspaces
- [x] Frontend: TanStack Start (React 19, SSR), port 3001
- [x] API: oRPC with type-safe procedures + OpenAPI docs
- [x] Auth: Better Auth (email/password + PIN login, cookie sessions)
- [x] Database: PostgreSQL + Drizzle ORM with migrations
- [x] Role-based access control: 5 roles (admin, floorManager, cashier, technician, inventoryClerk)
- [x] Environment validation via `@t3-oss/env-core`
- [x] UI: shadcn-style components on Base UI, Tailwind v4, dark mode

### Authentication Module — §2.6 (Mostly Complete)

- [x] Email/password login
- [x] Staff PIN-based login
- [x] Role-based dashboards (sidebar filters by role)
- [x] Session management (cookie-based, SSR-compatible)
- [x] Username-only login support (Better Auth username plugin)
- [ ] Authorization before any change/deletion (system-wide audit — not implemented)

### Floor Manager Module — §2.1 (Mostly Complete)

**Done:**

- [x] Customer search by phone and name
- [x] Create/edit customer profiles (name, phone, email, birthday day/month)
- [x] VIP flag + discount percentage on customer profile
- [x] Generate quotes (create quote → add line items with job types)
- [x] Quote status workflow (draft → completed via Send to Cashier, which creates invoice directly)
- [x] Quote PDF generation
- [x] Quote list with view/print/delete actions
- [x] Quote editor with items table, comments, totals

- [x] Search by invoice number (`floor.ts` joins invoice table for ILIKE search, UI placeholder: "Search by invoice #...")
- [x] Default phone prefix `+1 876` with replace option (`customer-modal.tsx` has `PHONE_PREFIX`, `stripPhonePrefix()`, hardcoded prefix display; `new-quote.tsx` too)
- [x] Pricing by inches for welding/reconstruction (`quote-generator-sheet.tsx` welding tab, `quoteItem.inches` column, API total calc: `inches * unitCost`)
- [x] VIP auto-discount application at quote time (`floor.ts` checks `isVip && discount` at quote creation, sets `discountPercent`)
- [x] Manual discount input on quote (`$quoteId.tsx` editable discount field, calls `quotes.update` with `discountPercent` on blur)
- [x] "Send to Technician" replaced with "Send to Cashier" on Floor Manager (creates invoice directly)
- [x] Quote editor read-only mode for completed quotes (hides Save/Send/Add Job/Remove)
- [x] Status badges on quote list (Draft / Invoiced)
- [x] `quotes.update` and `quotes.delete` hardened to `floorManagerProcedure`

**Not Done:**

- [ ] Send quote via email (Resend integration — no email infra yet)
- [ ] Send quote via SMS (external API — no SMS infra yet)
- [ ] Electronic quote viewer (public SSR page via link — no public routes)
- [ ] Print job label tag (rack identifier — `jobRack` field exists in schema but no print template)

### Cashier Module — §2.2 (Backend Complete, Frontend Complete)

**Done:**

- [x] Invoice schema (invoice, invoiceItem, payment tables in DB)
- [x] Invoice API — full CRUD: list (with filters), get, createFromQuote, update, delete
- [x] Payment API — record (with auto-status recalculation), list
- [x] "Send to Technician" API — cashier-only role guard, creates jobs from invoice items
- [x] Page with tabbed invoice list wired to real API (Unpaid / Partially Paid / Paid)
- [x] Tab counts from real API totals
- [x] Delete invoice wired to API mutation with cache invalidation
- [x] Loading skeleton state
- [x] Money formatted from cents to dollars, dates from Date objects
- [x] Invoice detail view (`$invoiceId/index.tsx` — items table, totals, payments, customer info)
- [x] Payment recording checkout page (`$invoiceId/checkout.tsx` — 5 payment methods, denomination breakdown, multi-payment support)
- [x] "Send to Technician" button on invoice detail page (wired to `cashier.jobs.sendToTechnician`)
- [x] Date filter wired to API (DateRangeDropdown passes `dateFrom` to all 3 tab queries)
- [x] Print receipt via `window.print()` with print CSS
- [x] Effect → oRPC error handling fixed (`runEffect` uses `runPromiseExit` with user-friendly messages)
- [x] Quote → Invoice conversion UI (Floor Manager "Send to Cashier" button creates invoice directly)
- [x] Discount + notes persisted from checkout (`handleConfirm()` calls `invoices.update` before recording payments)
- [x] Invoice detail shows notes, discount row, tax row in totals section
- [x] Payment history table on invoice detail (Date, Method, Amount, Reference, Received By)
- [x] Storage fee notice visible during print (removed `print:hidden`, added print-friendly styles)
- [x] "To Technician" button shows "Sent to Technician" (disabled) when jobs exist + job status summary bar
- [x] `jobs` Drizzle relation added to `invoiceRelations`, included in `invoices.get` API response

**Not Done:**

- [ ] E-receipt via email/SMS (depends on notification infra — Phase 4)
- [ ] Job completion notification to cashier (depends on notification infra — Phase 4)
- [ ] Outstanding payment auto-reminder to customer (depends on notification infra — Phase 4)

### Technician Module — §2.3 (Backend Complete, Frontend Mostly Complete)

**Done:**

- [x] Job schema (job table in DB with full relations)
- [x] Job API — list (with status/technician filters), get, accept, complete, setDueDate, addNote
- [x] Job API — reverse (resets job to pending, clears technician/dates, appends reason to notes)
- [x] Job API — verifyPin (validates user PIN against password hash via better-auth crypto)
- [x] Technicians list API — returns `{id, name}[]` for dropdowns
- [x] Page with tabs wired to real API via `useJobs()` hook
- [x] Jobs grouped by invoiceId client-side (one card per invoice)
- [x] Tab categorization: Assign (all pending), In Progress (any accepted/in_progress), Completed (all completed)
- [x] Accept job dialog: dynamic technician dropdown from API, due date wired to `setDueDate`, PIN verification, assigns selected technician
- [x] Complete job dialog: tech code verification via `verifyPin`, notes saved via `addNote`, controlled dialog state
- [x] Reverse job dialog: wired to `reverse` API with reason + PIN verification, all callers pass real `jobIds`
- [x] Detail views display real job data from invoiceItem relations
- [x] Cache invalidation on mutations, toast feedback
- [x] Filter row wired: owner filter ("All"/"Mine") passes `technicianId` to API, date filter (today/week/month) filters client-side
- [x] Filter state lifted to page level, shared across all tabs

**Partially Done:**

- [ ] Upload proof-of-work video — `UploadProofsDialog` UI component exists (file input, notes, before/after radio), `proofVideoUrl` DB column exists, but API endpoint + Azure Blob Storage missing

**Not Done:**

- [ ] Auto-notify customer on completion (SMS + email — depends on Phase 4)
- [ ] Notify cashier on job completion (in-app — depends on Phase 4)

### Inventory Module — §2.4 (Backend Complete, Frontend Complete)

**Done:**

- [x] Page with overnight job cards wired to real API
- [x] Notes modal for pickup/overnight/missing actions (wired to `markPickup`/`markMissing` API)
- [x] Inventory record schema (`inventoryRecord` table with EOD/SOD types, discrepancy tracking)
- [x] Inventory API — jobs: list (with filters), unfinished, markPickup, markMissing
- [x] Inventory API — records: createEOD, createSOD (with auto-discrepancy detection), list, latest
- [x] End-of-day verification flow (counts unfinished overnight jobs, records rim count)
- [x] Start-of-day reconciliation against previous EOD (compares rim counts, links to previousEodId)
- [x] Discrepancy flagging and admin notification (auto-detects mismatch → dispatches in-app notification to all admins)
- [x] Track all overnight jobs (`isOvernight` flag on jobs, `jobs.unfinished` endpoint)
- [x] Notification schema (`notification` table — types: inventory_discrepancy, discount_request, discount_approved/rejected, job_completed)
- [x] Notification API — list, unreadCount, markRead, markAllRead (protected, per-user)
- [x] Notification service — create, notifyAdmins, listForUser, unreadCount, markRead, markAllRead
- [x] SOD form component (compares with latest EOD, discrepancy alert, explanation field)
- [x] Frontend hooks: useOvernightJobs, useUnfinishedJobs, useInventoryRecords, useLatestRecords

### Admin Module — §2.5 (Partially Complete)

**Done:**

- [x] Service catalog CRUD (rim + general types, vehicle types, sizes, costs)
- [x] Employee management (create, edit, reset PIN, role assignment)
- [x] Dashboard with metrics, team activity, attention items (real DB aggregation)
- [x] VIP discount auto-applied at invoice creation time (in `createFromQuote` service)
- [x] VIP badge on customer list cards + VIP status column on customer profile

**Not Done:**

- [ ] VIP client management UI (upgrade/downgrade customers)
- [ ] Discount approval workflow (Floor Manager requests → Admin approves)
- [ ] Remove customer with invoice/job validation
- [ ] Clock in/out attendance tracking
- [ ] Expense recording
- [ ] View invoices and payments
- [ ] Daily reports (expenses, revenue, quotes, invoices)
- [ ] Multi-site support (location scoping)
- [ ] Job monitoring dashboard with real data (job ID, technician, work area, status)

### Loyalty / Birthday Module — §2.7 (Not Started)

- [ ] Track customer purchase frequency
- [ ] Surface loyalty data in customer profiles across modules
- [ ] Admin-configurable loyalty thresholds and benefits

### Digital Disclaimer / Signature — §2.8 (Not Started — Stage 3)

- [ ] Interactive tablet disclaimer with section-based signing
- [ ] Signature pad capture
- [ ] Save disclaimer under customer profile
- [ ] 7 disclaimer sections as per spec

### Notifications & Communication (Partially Complete)

**Done:**

- [x] Notification schema (`notification` table with type enum, recipient FK, read status)
- [x] In-app notification system (API: list, unreadCount, markRead, markAllRead)
- [x] Inventory discrepancy → admin notification trigger (wired in createSOD)

**Not Done:**

- [ ] SMS integration (external API endpoint)
- [ ] Email integration (Resend — configured but not wired)
- [ ] Notification bell UI in header with unread count
- [ ] Remaining notification triggers per spec table (quote sent, job completed, payment reminder, discount request/approval)

### Cross-Cutting Concerns (Not Started)

- [ ] Real-time updates (WebSocket/SSE) — addresses Bug #1
- [ ] Video/file storage (Azure Blob Storage)
- [ ] Print optimization (`@media print` CSS)

---

## Part 2: Implementation Plan (Recommended Order)

### Phase 1: Core Data Layer ~~(Invoice + Job + Payment schemas)~~ ✅ COMPLETE

> ~~Priority: **Critical**~~ — Done

- [x] Step 1.1: Invoice, InvoiceItem, Payment tables — `packages/db/src/schema/invoice.ts`
- [x] Step 1.2: Job table — `packages/db/src/schema/job.ts`
- [x] Seed data with users, quotes, invoices, jobs
- [ ] Step 1.3: Notification schema — **deferred to Phase 4**
- [ ] Step 1.4: Site schema (multi-site) — **deferred to Phase 6**

Note: Invoice status uses `unpaid/partially_paid/paid` (no `draft`/`overdue`). Job table lacks `acceptedById`/`completedById` separate columns (uses `technicianId` only).

---

### Phase 2: Cashier Module ✅ COMPLETE (except email/SMS — Phase 4)

> ~~Priority: **High**~~ — Done

- [x] Step 2.1: Invoice API — all 5 procedures implemented
- [x] Step 2.2: Payment API — record + list implemented, auto-status recalculation works
- [x] Step 2.3: "Send to Technician" API — cashier-only guard, creates jobs from invoice items
- [x] Step 2.4a: Invoice list with real data (tabs, counts, delete)
- [x] Step 2.4b: Invoice detail view (View button → `$invoiceId/index.tsx`)
- [x] Step 2.4c: Payment recording form (Pay button → `$invoiceId/checkout.tsx`)
- [x] Step 2.4d: Quote → Invoice conversion UI (Floor Manager "Send to Cashier" → `sendToCashier` endpoint)
- [x] Step 2.4e: "Send to Technician" button on invoice detail page (with job-aware disabled state)
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
- [ ] Step 3.1b: `technician.jobs.uploadProof` API endpoint
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

### Phase 5: Inventory Module ✅ COMPLETE

> ~~Priority: **Medium**~~ — Done

- [x] Step 5.1: Inventory API — `jobs.list`, `jobs.unfinished`, `jobs.markPickup`, `jobs.markMissing`
- [x] Step 5.1: Inventory records API — `records.createEOD`, `records.createSOD`, `records.list`, `records.latest`
- [x] Step 5.1: Discrepancy auto-detection in `createSOD` + admin notification dispatch
- [x] Step 5.2: Frontend wired to real API (overnight jobs, SOD form, hooks for all endpoints)
- [x] Step 5.2: SOD reconciliation view with previous EOD comparison and discrepancy alert

---

### Phase 6: Admin Enhancements (Not Started)

> Priority: **Medium**

#### Step 6.1: Financial Views

- [ ] View invoices and payments
- [ ] Expense recording (new `expense` table + CRUD)
- [ ] Daily reports: revenue, expenses, quotes, invoices
- [x] Dashboard metrics from real DB aggregation queries

#### Step 6.2: Workforce

- [ ] Clock in/out attendance tracking (new `attendance` table)
- [ ] Attendance reports

#### Step 6.3: VIP & Discounts

- [ ] VIP management UI (upgrade/downgrade customers)
- [ ] Discount approval workflow (request → admin approval → apply)

#### Step 6.4: Job Monitoring Dashboard

- [ ] Real-time job board: job ID, technician, work area, status
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
- [x] Hide "Send to Technician" from Floor Manager UI (replaced with "Send to Cashier")
- [ ] Print job label tag
- [ ] Send quote via email/SMS with electronic quote link (depends on Phase 4)
- [ ] Public electronic quote viewer page (SSR)

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
- [x] Storage fee notice on all receipts (removed `print:hidden`, added print-friendly border/bg styles)
- [ ] Job label tag print format

---

### Phase 10: Loyalty Program — §2.7 (Not Started)

> Priority: **Low**

- [ ] Purchase frequency tracking
- [ ] Loyalty data in customer profiles
- [ ] Admin-configurable thresholds

---

### Phase 11: Digital Disclaimer / Signature — §2.8 (Not Started — Stage 3)

> Priority: **Low** (explicitly Stage 3)

- [ ] Tablet signature capture (react-signature-canvas)
- [ ] 7 disclaimer sections
- [ ] Section-based signing
- [ ] Save to customer profile

---

## Part 3: Architecture Notes

### Resolved Design Decisions

1. **Invoice items**: ✅ Decided — Copy from quote items (snapshot). Implemented in `createFromQuote` service.
2. **"Send to Technician" enforcement**: ✅ Backend role-guard via `cashierProcedure`. ✅ Floor Manager UI now shows "Send to Cashier" (creates invoice directly), not "Send to Technician".
3. **VIP discount**: ✅ Auto-applied at both quote creation time (`floor.ts` checks `isVip && discount`) and carried through to invoice conversion (`createFromQuote` uses quote's `discountAmount`).

### Remaining Design Decisions

1. **Multi-site**: Add `siteId` to all tables or use a junction? → Recommend FK on quote/invoice/job (Phase 6.4)
2. **Discount workflow**: Inline on invoice or separate approval entity? → Recommend separate `discountRequest` table for audit trail (Phase 6.3)

### Technical Debt / Improvements

- ~~Technician, Cashier pages use hardcoded mock data~~ → ✅ Both now wired to real API
- ~~Accept dialog technician dropdown hardcoded~~ → ✅ Now loads from `technicians.list` API
- ~~QuoteGeneratorSheet uses ~15 manual useState calls + hand-rolled validation~~ → ✅ Refactored to `@tanstack/react-form` with Zod schemas (two forms: rim + welding), matching project patterns from customer-modal/service-modal
- ~~Dashboard metrics currently use mock/calculated data~~ → ✅ Real DB aggregation via `dashboard.ts` router (revenue, open/active jobs, overnight, team activity, attention counts)
- ~~Inventory page still uses hardcoded mock data~~ → ✅ Now wired to real API
- No real-time updates yet (polling could be interim via TanStack Query refetchInterval)
- No file upload infrastructure (Azure Blob Storage needed for proof-of-work videos)
- `acceptedById`/`completedById` audit columns missing from job table

### Security Gaps to Address

- "Send to Technician" is backend-enforced ✅ and hidden from Floor Manager UI ✅ (replaced with "Send to Cashier")
- Authorization before changes/deletions (audit log system) — not implemented
- Customer deletion validation (check for existing invoices/jobs) — not implemented
