# Rim Genie — Implementation Status & Plan

> Updated: 2026-02-21 | Based on `docs/REQUIREMENTS.md`

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

### Floor Manager Module — §2.1 (Partially Complete)

**Done:**

- [x] Customer search by phone and name
- [x] Create/edit customer profiles (name, phone, email, birthday day/month)
- [x] VIP flag + discount percentage on customer profile
- [x] Generate quotes (create quote → add line items with job types)
- [x] Quote status workflow (draft → pending → in_progress → completed)
- [x] Quote PDF generation
- [x] Quote list with view/print/delete actions
- [x] Quote editor with items table, comments, totals

**Not Done:**

- [ ] Search by invoice number (upgrade request)
- [ ] Default phone prefix `+1 876` with replace option
- [ ] Pricing by inches for welding/reconstruction
- [ ] VIP auto-discount application at quote time (only applied at invoice conversion)
- [ ] Manual discount input on quote
- [ ] Send quote via email (Resend integration)
- [ ] Send quote via SMS (external API)
- [ ] Electronic quote viewer (public SSR page via link)
- [ ] Print job label tag (rack identifier)
- [ ] "Send to Technician" button explicitly hidden from Floor Manager (currently visible)

### Cashier Module — §2.2 (Backend Complete, Frontend Partially Wired)

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

**Not Done:**

- [ ] "View" button action (invoice detail view / modal)
- [ ] "Pay" button action (payment recording form — amount, mode, reference)
- [ ] Quote → Invoice conversion UI (API exists, no frontend trigger)
- [ ] "Send to Technician" button on cashier page (API exists, no UI button)
- [ ] Date filter wired to actual date range filtering (dropdown is cosmetic)
- [ ] Apply admin-approved discounts and taxes (API supports discount/tax update, no UI)
- [ ] Add special notes to invoice (API supports, no UI)
- [ ] Print receipt (browser print preview)
- [ ] E-receipt via email/SMS
- [ ] Storage fee notice on every receipt
- [ ] Job completion notification to cashier
- [ ] Outstanding payment auto-reminder to customer

### Technician Module — §2.3 (Backend Complete, Frontend Partially Wired)

**Done:**

- [x] Job schema (job table in DB with full relations)
- [x] Job API — list (with status/technician filters), get, accept, complete, setDueDate, addNote
- [x] Page with tabs wired to real API via `useJobs()` hook
- [x] Jobs grouped by invoiceId client-side (one card per invoice)
- [x] Tab categorization: Assign (all pending), In Progress (any accepted/in_progress), Completed (all completed)
- [x] Accept job dialog wired to `technician.jobs.accept` mutation (accepts all pending jobs in group)
- [x] Complete job dialog wired to `technician.jobs.complete` mutation (completes all incomplete jobs in group)
- [x] Detail views display real job data from invoiceItem relations
- [x] Cache invalidation on mutations, toast feedback

**Not Done:**

- [ ] Accept dialog technician selector loads from employees API (currently hardcoded dropdown)
- [ ] Accept dialog completion date sends to `setDueDate` API (captured but not sent)
- [ ] PIN input validation in accept dialog (captured but not verified)
- [ ] Technician code validation in complete dialog (captured but not verified)
- [ ] Upload proof-of-work video (API endpoint missing, Azure Blob Storage not integrated)
- [ ] Auto-notify customer on completion (SMS + email)
- [ ] Notify cashier on job completion (in-app)
- [ ] Filter/organize jobs by technician (FilterRow renders but not wired)

### Inventory Module — §2.4 (UI Shell Only — Mock Data)

**Done:**

- [x] Page with mock job cards
- [x] Notes modal for pickup/overnight/missing actions

**Not Done:**

- [ ] **Inventory record schema** — no table in DB
- [ ] End-of-day verification flow
- [ ] Start-of-day reconciliation against previous close
- [ ] Discrepancy flagging and admin notification
- [ ] Track all overnight jobs

### Admin Module — §2.5 (Partially Complete)

**Done:**

- [x] Service catalog CRUD (rim + general types, vehicle types, sizes, costs)
- [x] Employee management (create, edit, reset PIN, role assignment)
- [x] Dashboard with metrics, team activity, attention items (mock/calculated data)
- [x] VIP discount auto-applied at invoice creation time (in `createFromQuote` service)

**Not Done:**

- [ ] Dashboard metrics from real DB aggregation (currently hardcoded multipliers)
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

### Notifications & Communication (Not Started)

- [ ] SMS integration (external API endpoint)
- [ ] Email integration (Resend — configured but not wired)
- [ ] In-app notification system
- [ ] Notification schema (no table in DB)
- [ ] All notification triggers per spec table

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

### Phase 2: Cashier Module ✅ Backend Complete, 🔶 Frontend Partial

> Priority: **High**

- [x] Step 2.1: Invoice API — all 5 procedures implemented
- [x] Step 2.2: Payment API — record + list implemented, auto-status recalculation works
- [x] Step 2.3: "Send to Technician" API — cashier-only guard, creates jobs from invoice items
- [x] Step 2.4a: Invoice list with real data (tabs, counts, delete)
- [ ] Step 2.4b: Invoice detail view (View button)
- [ ] Step 2.4c: Payment recording form (Pay button)
- [ ] Step 2.4d: Quote → Invoice conversion UI
- [ ] Step 2.4e: "Send to Technician" button on page
- [ ] Step 2.4f: Receipt view with print/email/SMS
- [ ] Step 2.4g: Date filter wired to API

---

### Phase 3: Technician Module ✅ Backend Complete, 🔶 Frontend Partial

> Priority: **High**

- [x] Step 3.1: Job API — list, get, accept, complete, setDueDate, addNote (uploadProof missing)
- [x] Step 3.3a: Frontend wired to real data (list, grouping, accept, complete mutations)
- [ ] Step 3.1b: `technician.jobs.uploadProof` API endpoint
- [ ] Step 3.2: Video upload (Azure Blob Storage integration)
- [ ] Step 3.3b: Technician dropdown from employees API
- [ ] Step 3.3c: Due date picker wired to setDueDate
- [ ] Step 3.3d: PIN/employee code validation
- [ ] Step 3.3e: Filter by technician

---

### Phase 4: Notification System (Not Started)

> Priority: **High** — Multiple modules depend on notifications

#### Step 4.1: In-App Notifications

- [ ] Notification schema (DB table)
- [ ] Notification API (list, mark read, mark all read)
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

- [ ] Wire all triggers per spec: quote sent, job completed, payment reminder, inventory discrepancy, discount request, discount approved/rejected

---

### Phase 5: Inventory Module (Not Started)

> Priority: **Medium** — Depends on Job schema (now complete)

#### Step 5.1: Inventory API

- [ ] `inventory.overnightJobs.list` — all overnight/unfinished jobs
- [ ] `inventory.records.createEOD` — end-of-day count
- [ ] `inventory.records.createSOD` — start-of-day verification
- [ ] `inventory.records.flagDiscrepancy` — flag + notify admin

#### Step 5.2: Inventory Frontend

- [ ] Replace mock data with real queries
- [ ] EOD verification form
- [ ] SOD reconciliation view
- [ ] Discrepancy flagging UI

---

### Phase 6: Admin Enhancements (Not Started)

> Priority: **Medium**

#### Step 6.1: Financial Views

- [ ] View invoices and payments
- [ ] Expense recording (new `expense` table + CRUD)
- [ ] Daily reports: revenue, expenses, quotes, invoices
- [ ] Dashboard metrics from real DB aggregation queries

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

### Phase 7: Floor Manager Enhancements (Not Started)

> Priority: **Medium**

- [ ] Default phone prefix `+1 876` in customer forms
- [ ] Search by invoice number
- [ ] Pricing by inches for welding/reconstruction services
- [ ] VIP auto-discount at quote creation
- [ ] Manual discount input on quote
- [ ] Print job label tag
- [ ] Send quote via email/SMS with electronic quote link
- [ ] Public electronic quote viewer page (SSR)
- [ ] Hide "Send to Technician" from Floor Manager UI

---

### Phase 8: Real-Time Updates (Not Started)

> Priority: **Medium** — Addresses Bug #1 from legacy system

- [ ] WebSocket or SSE server (Azure Web PubSub or custom)
- [ ] Quote created → appears in cashier queue instantly
- [ ] Job status changes → reflected in all views
- [ ] Notification push to connected clients

---

### Phase 9: Print & Receipt Optimization (Not Started)

> Priority: **Low-Medium**

- [ ] `@media print` stylesheets for receipts, invoices, job tags
- [ ] Receipt layout: 8+ services per page, address beside logo
- [ ] Storage fee notice on all receipts
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
2. **"Send to Technician" enforcement**: ✅ Backend role-guard via `cashierProcedure`. UI hiding still needed on floor manager page.
3. **VIP discount**: ✅ Auto-applied at invoice conversion time (not at quote time per spec request).

### Remaining Design Decisions

1. **Multi-site**: Add `siteId` to all tables or use a junction? → Recommend FK on quote/invoice/job (Phase 6.4)
2. **Discount workflow**: Inline on invoice or separate approval entity? → Recommend separate `discountRequest` table for audit trail (Phase 6.3)

### Technical Debt / Improvements

- ~~Technician, Cashier pages use hardcoded mock data~~ → ✅ Both now wired to real API
- Dashboard metrics currently use mock/calculated data — need real aggregation queries
- Inventory page still uses hardcoded mock data
- No real-time updates yet (polling could be interim via TanStack Query refetchInterval)
- No file upload infrastructure (Azure Blob Storage needed for proof-of-work videos)
- Accept dialog technician dropdown hardcoded (should load from employees API)
- `acceptedById`/`completedById` audit columns missing from job table

### Security Gaps to Address

- "Send to Technician" is backend-enforced ✅ but still visible in Floor Manager UI ❌
- Authorization before changes/deletions (audit log system) — not implemented
- Customer deletion validation (check for existing invoices/jobs) — not implemented
