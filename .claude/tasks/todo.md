# Rim Genie — Implementation Status & Plan

> Generated: 2026-02-20 | Based on `docs/REQUIREMENTS.md`

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
- [ ] VIP auto-discount application at quote time
- [ ] Manual discount input on quote
- [ ] Send quote via email (Resend integration)
- [ ] Send quote via SMS (external API)
- [ ] Electronic quote viewer (public SSR page via link)
- [ ] Print job label tag (rack identifier)
- [ ] "Send to Technician" button explicitly hidden from Floor Manager

### Cashier Module — §2.2 (UI Shell Only — Mock Data)
**Done:**
- [x] Page with tabbed invoice list (Unpaid / Partially Paid / Paid)
- [x] Basic UI shell with date filter

**Not Done:**
- [ ] **Invoice schema** — no `invoice` table in DB
- [ ] **Payment schema** — no `payment` table in DB
- [ ] Quote → Invoice conversion
- [ ] Record payments (full/partial) with payment mode
- [ ] Payment modes: Credit Card, Debit Card, Online Bank Transfer, Cash, Cheque
- [ ] "Send to Technician" button (cashier-exclusive)
- [ ] Apply admin-approved discounts and taxes
- [ ] Add special notes to invoice
- [ ] Print receipt (browser print preview)
- [ ] E-receipt via email/SMS
- [ ] Storage fee notice on every receipt
- [ ] Job completion notification to cashier
- [ ] Outstanding payment auto-reminder to customer

### Technician Module — §2.3 (UI Shell Only — Mock Data)
**Done:**
- [x] Page with tabs (New / Assign / In Progress / Completed)
- [x] Job card and detail view components
- [x] Accept job dialog, complete job dialog, reverse dialog
- [x] Upload proofs dialog UI

**Not Done:**
- [ ] **Job schema** — no `job` table in DB
- [ ] Job assignment with employee number tracking
- [ ] Job acceptance workflow
- [ ] Mark job complete with employee number verification
- [ ] Upload 30-second proof-of-work video (Azure Blob Storage)
- [ ] Auto-notify customer on completion (SMS + email)
- [ ] Notify cashier on job completion (in-app)
- [ ] Set due date / flag as overnight job
- [ ] Add special notes to job
- [ ] Filter/organize jobs by technician (upgrade request)

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
- [x] Dashboard with metrics, team activity, attention items

**Not Done:**
- [ ] VIP client management (upgrade customers to VIP with auto-discount)
- [ ] Discount approval workflow (Floor Manager requests → Admin approves)
- [ ] Remove customer with invoice/job validation
- [ ] Clock in/out attendance tracking
- [ ] Expense recording
- [ ] View invoices and payments
- [ ] Daily reports (expenses, revenue, quotes, invoices)
- [ ] Multi-site support (location scoping)
- [ ] Job monitoring dashboard (job ID, technician, work area, status)

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
- [ ] All notification triggers per spec table

### Cross-Cutting Concerns (Not Started)
- [ ] Real-time updates (WebSocket/SSE) — addresses Bug #1
- [ ] Video/file storage (Azure Blob Storage)
- [ ] Print optimization (`@media print` CSS)

---

## Part 2: Implementation Plan (Recommended Order)

### Phase 1: Core Data Layer (Invoice + Job + Payment schemas)
> Priority: **Critical** — All remaining modules depend on this

#### Step 1.1: Invoice & Payment Schema
- Add `invoice` table: id, invoiceNumber (serial), quoteId (FK), customerId (FK), status (draft/pending/paid/partially_paid/overdue), subtotal, discount, tax, total, notes, createdById, createdAt, updatedAt
- Add `payment` table: id, invoiceId (FK), amount, mode (credit_card/debit_card/bank_transfer/cash/cheque), reference, receivedById, createdAt
- Add `invoiceItem` table (mirror of quoteItem but for invoice): id, invoiceId, description, quantity, unitCost, jobTypes, etc.
- Migration + seed

#### Step 1.2: Job Schema
- Add `job` table: id, invoiceId (FK), invoiceItemId (FK), technicianId (FK → user), status (pending/accepted/in_progress/completed), acceptedById (FK → user, employee number tracking), completedById, dueDate, isOvernight, specialNotes, proofVideoUrl, acceptedAt, completedAt, createdAt, updatedAt
- Migration

#### Step 1.3: Notification Schema
- Add `notification` table: id, userId (FK), type (enum), title, message, read (boolean), relatedEntityType, relatedEntityId, createdAt

#### Step 1.4: Site Schema (Multi-site)
- Add `site` table: id, name, address, isActive
- Add `siteId` FK to relevant tables (quote, invoice, job, customer-site junction)

---

### Phase 2: Cashier Module (Full Implementation)
> Priority: **High** — Central to the business flow (quotes → invoices → payments → jobs)

#### Step 2.1: Invoice API
- `cashier.invoices.list` — list invoices with filters (status, date range, customer)
- `cashier.invoices.get` — get invoice with items and payments
- `cashier.invoices.createFromQuote` — convert quote to invoice (copy items, link quote)
- `cashier.invoices.update` — update notes, apply discount
- `cashier.invoices.delete` — with authorization check

#### Step 2.2: Payment API
- `cashier.payments.record` — record payment (amount, mode, reference)
- `cashier.payments.list` — list payments for an invoice
- Auto-update invoice status based on payment totals

#### Step 2.3: "Send to Technician" API
- `cashier.jobs.sendToTechnician` — create job(s) from invoice items
- Role-guard: cashier-only (not floor manager)

#### Step 2.4: Cashier Frontend
- Invoice list with real data (replace mock)
- Quote → Invoice conversion UI
- Payment recording form (amount, mode, reference)
- Receipt view with print/email/SMS options
- Storage fee notice at bottom of receipt
- "Send to Technician" button (cashier-exclusive)

---

### Phase 3: Technician Module (Full Implementation)
> Priority: **High** — Core operational workflow

#### Step 3.1: Job API
- `technician.jobs.list` — list jobs by status + technician filter
- `technician.jobs.accept` — accept job (requires employee number)
- `technician.jobs.complete` — mark complete (requires employee number)
- `technician.jobs.setDueDate` — set due date, flag as overnight
- `technician.jobs.addNote` — add special notes
- `technician.jobs.uploadProof` — upload proof-of-work video

#### Step 3.2: Video Upload
- Azure Blob Storage integration
- Presigned URL generation for direct upload
- 30-second video validation (size/duration)

#### Step 3.3: Technician Frontend
- Replace mock data with real job queries
- Wire accept/complete/reverse dialogs to API
- Due date picker with overnight flag
- Video upload with progress indicator
- Filter by technician

---

### Phase 4: Notification System
> Priority: **High** — Multiple modules depend on notifications

#### Step 4.1: In-App Notifications
- Notification API (list, mark read, mark all read)
- Notification bell in header with unread count
- Notification dropdown/panel

#### Step 4.2: Email Integration (Resend)
- Configure Resend transactional email
- Quote email template
- Receipt email template
- Payment reminder template

#### Step 4.3: SMS Integration
- Integrate with provided SMS API endpoint (or Twilio)
- Quote SMS with link
- Job completion SMS
- Payment reminder SMS

#### Step 4.4: Notification Triggers
- Wire all triggers per spec: quote sent, job completed, payment reminder, inventory discrepancy, discount request, discount approved/rejected

---

### Phase 5: Inventory Module (Full Implementation)
> Priority: **Medium** — Depends on Job schema from Phase 1

#### Step 5.1: Inventory API
- `inventory.overnightJobs.list` — all overnight/unfinished jobs
- `inventory.records.createEOD` — end-of-day count
- `inventory.records.createSOD` — start-of-day verification
- `inventory.records.flagDiscrepancy` — flag + notify admin

#### Step 5.2: Inventory Frontend
- Replace mock data with real queries
- EOD verification form
- SOD reconciliation view
- Discrepancy flagging UI

---

### Phase 6: Admin Enhancements
> Priority: **Medium**

#### Step 6.1: Financial Views
- View invoices and payments
- Expense recording (new `expense` table + CRUD)
- Daily reports: revenue, expenses, quotes, invoices

#### Step 6.2: Workforce
- Clock in/out attendance tracking (new `attendance` table)
- Attendance reports

#### Step 6.3: VIP & Discounts
- VIP management UI (upgrade/downgrade customers)
- Discount approval workflow (request → admin approval → apply)

#### Step 6.4: Job Monitoring Dashboard
- Real-time job board: job ID, technician, work area, status
- Multi-site dashboard switching

---

### Phase 7: Floor Manager Enhancements
> Priority: **Medium**

- Default phone prefix `+1 876` in customer forms
- Search by invoice number
- Pricing by inches for welding/reconstruction services
- VIP auto-discount at quote creation
- Manual discount input on quote
- Print job label tag
- Send quote via email/SMS with electronic quote link
- Public electronic quote viewer page (SSR)

---

### Phase 8: Real-Time Updates
> Priority: **Medium** — Addresses Bug #1 from legacy system

- WebSocket or SSE server (Azure Web PubSub or custom)
- Quote created → appears in cashier queue instantly
- Job status changes → reflected in all views
- Notification push to connected clients

---

### Phase 9: Print & Receipt Optimization
> Priority: **Low-Medium**

- `@media print` stylesheets for receipts, invoices, job tags
- Receipt layout: 8+ services per page, address beside logo
- Storage fee notice on all receipts
- Job label tag print format

---

### Phase 10: Loyalty Program — §2.7
> Priority: **Low**

- Purchase frequency tracking
- Loyalty data in customer profiles
- Admin-configurable thresholds

---

### Phase 11: Digital Disclaimer / Signature — §2.8 (Stage 3)
> Priority: **Low** (explicitly Stage 3)

- Tablet signature capture (react-signature-canvas)
- 7 disclaimer sections
- Section-based signing
- Save to customer profile

---

## Part 3: Architecture Notes for Implementation

### Database Design Decisions Needed
1. **Invoice items**: Copy from quote items (snapshot) or reference them? → Recommend **copy** (invoices should be immutable records)
2. **Multi-site**: Add `siteId` to all tables or use a junction? → Recommend FK on quote/invoice/job
3. **Discount workflow**: Inline on invoice or separate approval entity? → Recommend separate `discountRequest` table for audit trail

### Technical Debt / Improvements
- Dashboard metrics currently use mock/calculated data — need real aggregation queries
- Technician, Cashier, Inventory pages use hardcoded mock data — need real API integration
- No real-time updates yet (polling could be interim via TanStack Query refetchInterval)
- No file upload infrastructure (Azure Blob Storage needed for proof-of-work videos)

### Security Gaps to Address
- "Send to Technician" must be backend-enforced (cashier-only), not just UI-hidden
- Authorization before changes/deletions (audit log system)
- Customer deletion validation (check for existing invoices/jobs)
