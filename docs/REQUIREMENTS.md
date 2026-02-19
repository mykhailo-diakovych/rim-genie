# Rim Genie — Product Requirements

> Sources: _Rim Genie Functional Requirements - Legacy.pdf_ + _Rim Genie Upgrade Request - 2025-11-08.pdf_

---

## Business Context

Rim Genie is a **rim repair warehouse** in Jamaica. The platform manages:

- Walk-in customer quoting and job intake (Floor Manager)
- Payment processing and receipts (Cashier)
- Job execution tracking with proof-of-work (Technician)
- Overnight inventory verification (Inventory Clerk)
- System-wide configuration, reporting, and multi-site management (Admin)

Phone numbers default to Jamaican prefix **+1 876**.

---

## User Roles & Device Targets

| Role            | Module         | Devices                        |
| --------------- | -------------- | ------------------------------ |
| Floor Manager   | Floor Manager  | Desktop, Tablet                |
| Cashier         | Cashier        | Desktop (tablet in rare cases) |
| Technician      | Technician     | Tablet only                    |
| Inventory Clerk | Inventory      | Tablet, Mobile                 |
| System Admin    | Administration | Desktop, Tablet, Mobile        |

All roles must authenticate before accessing the platform. Users land on a role-specific dashboard after login.

---

## Module Specifications

### 2.1 Floor Manager Module

**Purpose:** Generate quotes for walk-in customers, print job tags, route work to cashier.

**Flow:**

1. Search customer by phone number → if not found, create new profile
2. Generate quote (services + pricing)
3. Optionally send quote to customer via email or SMS (with link to electronic quote)
4. Quote automatically appears in cashier's queue
5. Print job label tag (rack identifier)

**Customer Profile fields:** name, email (optional), phone number, birthday (day + month only — no year for privacy)

**Functional Requirements:**

- REQ-1: Add/modify customer profiles
- REQ-2: Add/modify quotes
- REQ-3: Send quotes via email/SMS
- REQ-4: Route quote to cashier for payment
- REQ-5: Apply VIP discounts where applicable

**Upgrade Requests (from client):**

- Search by name, phone number, OR invoice number (currently only phone)
- Accounts without email — allow username-only login
- Default phone prefix `1876` (replaceable)
- Pricing for welding/reconstruction entered **by inches**
- VIP discount: auto-apply for flagged customers, manual override available for all

---

### 2.2 Cashier Module

**Purpose:** Convert quotes to invoices, record payments, generate receipts, route jobs to technicians.

**Flow:**

1. Query customer → select quote → convert to invoice
2. Apply payment (full or partial)
3. Route job to repair technicians
4. Generate e-receipt (print, email, or SMS)
5. Prompt for follow-up on outstanding payments; auto-notify customer before pickup

**Payment Modes:** Credit Card, Debit Card, Online Bank Transfer, Cash, Cheque

**Functional Requirements:**

- REQ-1: Record payments against invoices
- REQ-2: Capture payment mode
- REQ-3: Full or partial payment support
- REQ-4: Add special notes to invoice
- REQ-5: Apply discounts (pre-approved by admin) and taxes
- REQ-6: Print receipt or send e-receipt via email/SMS

> Note: "Print" = browser print preview; user selects printer manually.

**Security:**

- "Send to Technician" button must **only** be visible to Cashier — not Floor Manager (anti-collusion)
- Any change or deletion in the system requires authorization

**Upgrade Requests:**

- Receipts via SMS and email in addition to print
- Storage fee notice printed at bottom of every receipt: _"Rims left in Rim Genie beyond 30 days will attract a storage fee of $500 daily"_

---

### 2.3 Technician Module

**Purpose:** Tablet-based job queue for technicians to accept, track, and complete jobs.

**Flow:**

1. View incoming job list → accept job (enter employee number for tracking)
2. Search for a specific job
3. Input tentative completion date (5 / 10 / 15 days → flags as overnight job)
4. Add special notes
5. Flag job complete → auto-notifies customer via Email/SMS
6. Upload 30-second proof-of-work video

**Key rules:**

- Employee number required at job accept and job complete
- One invoice can be split across multiple technicians
- Jobs with a due date are flagged as **overnight** and tracked by Inventory Clerk

**Functional Requirements:**

- REQ-1: Flag jobs as accepted, complete, or set due date (overnight)
- REQ-2: Add special notes
- REQ-3: Auto-notify customer on completion (Email/SMS)

**Upgrade Requests:**

- Job completion notification routed to Cashier (so she calls customer) **and** SMS to customer
- Jobs organized/filterable by Technician (currently scattered)

---

### 2.4 Inventory Management Module

**Purpose:** Track overnight jobs and verify rim inventory at start/end of business day.

**Flow:**

1. End of day: verify all unfinished jobs, record total rims in inventory
2. Start of day: verify against previous day's record, flag discrepancies
3. Notify admin of discrepancies
4. Add special notes

**Functional Requirements:**

- REQ-1: Track overnight jobs
- REQ-2: Record and reconcile daily inventory
- REQ-3: Dispatch discrepancy notifications to admin

---

### 2.5 System Administration Module

**Purpose:** Configure the system, manage staff, run reports, track all jobs and financials. Remote-accessible.

**Capabilities:**

- Add/edit services and pricing (reflected in quote generation)
- Create and manage VIP clients (auto-discount) — upgrade existing customers to VIP
- Approve discount requests from Floor Manager
- Add/remove team members (staff accounts)
- Remove customers (system validates no open invoices/jobs before deletion)
- All staff clock in/out for attendance tracking
- Record expenses
- Generate daily reports: expenses, revenue, quotes, invoices
- Multi-site support (switch dashboard between locations)

**Dashboard Requirements:**

- Viewable from any device (desktop/tablet/mobile)
- Shows: recent jobs, invoices, technician assignments, job status, work area

**Functional Requirements:**

- REQ-1: System-wide settings and general reports
- REQ-2: Job monitoring dashboard (job, technician, work area, status)

---

### 2.6 Authentication Module

All team members authenticate before accessing the platform.

**Flow:**

1. Enter username + password/PIN
2. Presented with role-specific dashboard

**Upgrade Requests:**

- Support accounts without email (username-only)
- Authorization required before any change or deletion (currently missing)

---

### 2.7 Loyalty Program & Birthday Module

**Purpose:** Track customer purchase frequency and birthdays for loyalty eligibility.

**Flow:**

- Search customer by phone → display profile summary: recent purchases, total purchases, birthday (day/month)

> Note: Only day and month of birthday stored — year intentionally excluded for privacy.

**Functional Requirements:**

- REQ-1: Track purchase frequency
- REQ-2: Track customer birthdays (day/month only)

---

### 2.8 Digital Disclaimer / Customer Signature (Stage 3)

**Purpose:** Interactive tablet-based disclaimer that customers sign before service. Saved under customer profile.

**Behavior:**

- Broken into sections — customer signs only applicable sections
- Captured on tablet screen, saved to profile

**Disclaimer sections:**

1. **Tire/Center Cap Damage** — pre-existing dry rot, crystallization, low tire pressure; Rim Genie not liable
2. **Scratches/Discoloration** — heating process may cause surface changes; Rim Genie not liable
3. **Lug Nut/Stud Damage** — Rim Genie not liable for damage during removal
4. **Welding Warranty** — 1-month warranty on welds for straightened rims; voided if rim is out of round or bent; does not cover cosmetic/structural imperfections; excludes commercial and public passenger vehicles
5. **Diamond Cutting Variations** — slight appearance differences if not all 4 rims cut simultaneously; recommend cutting all 4 at once; Rim Genie not liable for perceived differences
6. **General Inspection Limitation** — latent/underlying defects may not be visible; customer acknowledges this
7. **Acknowledgment** — _"By signing, you acknowledge that you have read, understood and agreed to the terms outlined."_

---

## Known Bugs in Legacy System (from client — Stage 1)

| #   | Bug                                                                               |
| --- | --------------------------------------------------------------------------------- |
| 1   | Floor manager entries require page refresh to appear in technician/cashier queues |
| 2   | Invoice/receipt items after the 4th don't print                                   |
| 3   | Initial page comment not shown when printed                                       |
| 4   | Save button in quotations screen duplicates invoice with new number               |
| 5   | New services added to invoice not visible when reopening invoice                  |
| 6   | "Partially Accept" button no longer appears                                       |
| 7   | Manage Price entries not reflected in quote generation options                    |
| 8   | "Other welding" options on quotation screen not appearing on receipt              |
| P   | Slight delay when signing into the system                                         |

---

## UI/UX Label Corrections (from client — Stage 1)

| Screen    | Current Label                      | Correct Label                                                   |
| --------- | ---------------------------------- | --------------------------------------------------------------- |
| General   | Rim Type: Off the Market / Factory | Side of vehicle rim removed from                                |
| Rotors    | Vehicle size options               | Sedan/Small Cars · Mid-Size SUV/Pick-up · Full-Size SUV/Pick-up |
| Tire Work | "Remove and Repair Rim"            | "Remove and Replace"                                            |
| Polishing | "Number of Polishing"              | "Area to be Polished: Lip / Face / Spot Polish"                 |
| Receipt   | Row size (only ~4 items per page)  | Reduce row height — target 8 services per page                  |
| Receipt   | Address section below logo         | Move address beside logo to save vertical space                 |

---

## Notification & Communication

- **SMS:** via provided API endpoint (requires phone number + message only)
- **Email:** standard email delivery
- **Triggers:** quote sent, job complete (→ cashier + customer SMS), outstanding payment reminder

---

## Multi-Site

Admin dashboard can switch between different physical site locations.
