# RIM-4 — Round 2 (Orane feedback, comment `aa93717c`)

> Source: https://linear.app/caseeasy/issue/RIM-4#comment-aa93717c (posted 2026-08-14)
> Follow-up 2026-08-16: _"this takes precedence over CaseEasy Tasks"_
> Round 1 (T1–T7) is archived in `todo-round1-archive.md`.

**21 work items** (20 from the comment; C3 split into two defects, and the tablet button broken out
as C21). **19 in scope** — C12 and C14 are deferred and being handled separately.
Each is scoped below with the verified root cause where I found one. Items marked
**[VERIFIED]** have a confirmed cause read out of the source; **[NEEDS REPRO]** need a live check
against the deployed app or the Neon DB before I commit to a fix.

---

## Decisions (resolved 2026-08-17)

- **D1 → PARKED.** Vercel Blob was chosen, but C12/C14 are **deferred out of this round** at the
  user's direction (2026-08-17) — the upload feature will be handled separately. No storage is
  provisioned and none is needed for the remaining items. Revisit when C12/C14 are picked up.
- **D2 → Invite email with a set-password link.** Employee chooses their own PIN; `employees.resetPin`
  stays as the admin override. Note this makes **C15 (Resend verified) a hard dependency of C2** —
  if the sending domain isn't verified, invites won't arrive.
- **D3 → see below.**

### D1. File storage provider for job proofs — **PARKED with C12/C14**

There is **no storage backend in this repo at all** — no S3, no Vercel Blob, no UploadThing, no
Cloudinary. `job.proofVideoUrl` is a single `text` column that nothing ever writes to, and
`upload-proofs-dialog.tsx` is a UI shell with no mutation behind it: it collects files into React
state and throws them away when the dialog closes.

So "there's no way to view recordings" is downstream of the fact that **nothing has ever been
uploaded**. Building C12/C14 means provisioning storage first. Since the app is on Vercel,
**Vercel Blob** is the path of least resistance (no new vendor, no CORS/IAM setup, direct
client uploads). Alternatives: Cloudflare R2 (cheapest egress at video scale), or S3.

**Parked.** Preference recorded as Vercel Blob for whenever C12/C14 are revived.

### D2. Password registration flow (C2) — **DECIDED: invite email**

Orane asks "how does a team member set a password / register their password?" — that's a question,
not a spec. Options:

- **(a) Invite email with a set-password link** — admin creates the employee, they receive an
  email, choose their own PIN. Best practice, needs Resend to be verified (see C15).
- **(b) Admin sets the PIN, hands it over verbally** — this is what happens today.
- **(c) PIN-only, no password at all** — floor staff never touch email.

**Decided: (a), keeping (b) as the admin override that already exists (`employees.resetPin`).**

### D3. Tablet primary action button — **RESOLVED from the screenshot**

The screenshot shows the quote screen: it's the **"+ Add Job"** button at the foot of the
_Services to be Conducted_ table, currently a small left-aligned link-style button. The red arrow
points it to the centre. Tracked as **C21** below. No further input needed.

---

## Phase 1 — Auth & access (blocks the client's own testing)

### C1. PIN access does not work for new users **[VERIFIED]**

Two independent defects, either of which locks a new employee out:

1. **No location assignment ⇒ hard lockout.** `packages/auth/src/index.ts` runs an after-hook on
   `/sign-in/username` that rejects the session unless `assertUserCanUseLocation` finds a row in
   `userLocation`. But `employee-modal.tsx:58` validates `locationIds: z.array(z.string().min(1))`
   with **no `.min(1)` on the array**, and `employees.create` defaults it to `[]`. Create an
   employee without ticking a location — which the UI happily allows — and they can never log in.
   The error surfaced is "You are not assigned to this location", which reads like a location
   problem, not a PIN problem.
2. **Username is written raw, bypassing the plugin normalizer.** `employees.create` sets the
   username with a direct `db.update(user).set({ username: input.employeeId })` _after_
   `auth.api.createUser`. Better Auth 1.4.18's username plugin normalizes on input and looks up with
   `where username = normalizer(input)` (verified in `dist/plugins/username/index.mjs:108`). The
   field regex allows uppercase, so an admin typing `John.Smith` stores `John.Smith` but login
   searches for `john.smith` → "user not found". `displayUsername` is never set either.

- [x] Require at least one location in the Zod schema **and** the API input (`create` now `.min(1)`;
      `update` optional-but-never-empty, so you can't clear the last one)
- [x] Show the error on the location field, which previously had no error affordance at all
- [x] Warn explicitly when zero locations exist — otherwise `.min(1)` makes the form silently
      unsubmittable, since the field only renders when locations exist
- [x] Normalize `username` on write + set `displayUsername` (create **and** update), and compare
      normalized in both uniqueness pre-checks — the old check let `John.Smith` pass while colliding
      with `john.smith` at the DB unique index
- [x] Distinguish the two sign-in failures: "no location assigned" (setup fault) vs "not assigned to
      this location" (wrong branch)
- [ ] **Backfill the 4 locked-out live users — awaiting approval, see below**

**Live audit (Neon, 2026-08-17): 4 of 11 users are locked out**, all with zero locations:

| username | name | role |
|---|---|---|
| `technic_28` | Technic Mykhailo | technician |
| `111111` | Test1 Tester | technician |
| _(none)_ | Mykhailo Diakovych — `admin1@rimgenie.com` | floorManager |
| _(none)_ | Mykhailo Diakovych — `admin2@rimgenie.com` | cashier |

The two technicians are exactly Orane's report. The two username-less rows are Feb-24 seed accounts
that can never use the staff PIN form regardless (sign-in is by username), though they can still use
email/password.

No mixed-case usernames exist yet, so defect #2 hasn't bitten in production — but `employeeIdField`
permits uppercase, so it was a live landmine. Fixed pre-emptively.

Locations available: **Main Office** (5 users) and **Hagley Park Office** (3).

_Verified: `tsc --noEmit` clean across web/api/auth, `oxlint` 0 errors._

> Note: `turbo check-types` is a **no-op** — no package defines that script. Typechecking must be run
> as `bunx tsc --noEmit` per package. Worth fixing separately.

### C2. Team member password registration — **DONE**

Orane's question: *"How does team member set a password access or to register their password?"*
Answer, per D2: they receive an emailed link and choose their own 4-digit PIN.

- [x] Invite emailed automatically when an employee is created; a mail failure is reported via
      `inviteSent: false` rather than thrown, so a failed send never leaves a half-created account
- [x] **Resend invite** action on the employees list, for expired links or a mistyped address
- [x] Public `/set-pin?token=…` page — greets the invitee by name, shows the Employee ID they will
      sign in with, takes the PIN twice and refuses a mismatch
- [x] `hashPassword` re-exported from `@rim-genie/auth/crypto` so the written hash is produced by
      Better Auth's own implementation and matches what `/sign-in/username` verifies

**No migration needed.** Tokens live in Better Auth's generic `verification` table (identifier is
already indexed) under a namespaced `staff-invite:` identifier. 32 random bytes, 7-day expiry,
single-use, and issuing a new one deletes the previous — so a resend invalidates the old link.
Expired rows are swept opportunistically on each issue.

**The page sits outside `_auth` on purpose.** That layout redirects anyone with a session to the
dashboard, and an invitee may well open the link on a shared tablet where someone is already signed
in. Here the token *is* the credential, not the session.

**The PIN is written straight to the credential `account` row** rather than through
`auth.api.setUserPassword`, which is an admin endpoint — the recipient is by definition not signed in.

_Verified in-browser:_ a bogus token shows "This link is not valid"; a real token (minted directly in
the DB, **no email sent**) renders "Welcome, Test1 Tester … Employee ID 111111"; mismatched PINs show
"Both PINs must match" and keep the button disabled. I stopped short of submitting — that would have
changed a real user's password. Test token deleted afterwards; `staff-invite` rows back to 0.

⚠️ The admin still sets an initial PIN at creation, so the employee has immediate access and the
invite lets them replace it with one only they know. Making the PIN optional at creation (invite-only
accounts) is a sensible follow-up but changes the create form's validation, so it was not assumed.

---

## Phase 2 — Quote Builder

### C4. Quote from a client profile skips the standard flow **[VERIFIED]**

`customers/$customerId.tsx:433` calls `client.floor.quotes.create({ customerId })` directly, with no
`customerReason` and no `fullDiagnosticConsent`. The proper flow lives in `NewQuoteSheet`, which is
only wired into `/floor` (`floor/index.tsx:266`). The API already accepts both fields
(`floor.ts:413-414`), so this is purely a front-end wiring gap.

- [x] `NewQuoteSheet` takes an optional `customer` prop; when set, the lookup is replaced by a fixed
      read-only row (the quote can only be for that person)
- [x] The customer profile's *Add Quote* now opens that sheet instead of calling
      `quotes.create` directly — the direct-create path is gone

_Verified in-browser:_ Add Quote from Jess James's profile opens the sheet with the customer locked,
prompts for reason + diagnostic consent, and the created quote shows
`Reason for visit: "Curb rash on two rims"` plus a `Full Diagnostic Service` line with
`Comments: Agree` — identical to the `/floor` flow.

### C5. Other Welding doesn't calculate from length **[NEEDS REPRO]**

`quote-generator-sheet.tsx:432-434` slugifies the _label_ back into a price key
(`materialType.toLowerCase().replace(/\s+/g,"-")`), because the select stores `mt.label` as its
value (line 1091) rather than `mt.key`. When the lookup misses, `perInch` is `0` and the cost
silently falls back to `editItem?.unitCost ?? 0` — a zero that looks like "not calculating".

The label↔key round-trip is lossless for the current key shapes, so the more likely cause is that
`servicePrice` has **no `category = 'welding'` rows in the live Neon DB**. Needs a DB check.

**My plan's hypothesis was wrong — the data was fine all along.** Neon has all four welding rows
(`aluminium` 130000, `cast-iron` 150000, `stainless-steel` 130000, `steel` 100000), the lookup
request fires, and it returns `{"aluminium":{"unitCost":130000,"found":true},…}`. The label↔key
round-trip also works. Two different bugs were responsible:

**1. A one-word tab mismatch (the $0.00).** The running total branches on `tab === "welding"`
(line 1767) — but the tab's value is **`"other-welding"`** everywhere else in the file
(`TabsTrigger value` 785, `setTab` 625, render check 1818). The branch never matched, so it fell
through to the final `editItem?.unitCost ?? 0` fallback, which is `0` for a new item. Only welding
had this; `rims`, `general` and `powder-coating` all compare correctly.

**2. Length applied twice (a pricing error, not just a display one).** `computeItemPrice` returned
`perInch * inches` for welding, and that value is stored as `unitCost`. But every consumer already
multiplies by `inches` — `recalcQuoteTotal` (`quote.service.ts:10`) and the invoice subtotal
(`invoice.service.ts:54`). So a stored weld priced at **perInch × inches²**. At Orane's numbers that
is 55 × (55 × $1,300) = **$3,932,500** instead of $71,500. Introduced 2026-07-08 in `4761861`.

- [x] Total bar compares `"other-welding"` and multiplies by the entered length
- [x] Length mirrored into `weldingSelects` (as the material already was) so the total, which sits
      outside the form's render prop, can read it; wired into reset + edit-rehydrate
- [x] `computeItemPrice` returns the **per-inch rate** for welding, matching how `inches` is used
      downstream; client submit stores `perInch` too instead of `perInch * inches`

_Verified in-browser with Orane's exact inputs:_ Aluminium + 55" now reads **$71,500.00**
(= 55 × $1,300), previously **$0.00**.

⚠️ **Separate finding, not fixed — `inches` is overloaded.** `recalcQuoteTotal` multiplies by
`inches` whenever it is non-null, but tire/general items store the *tire size* there, not a quantity.
A live row reads `Tire: 17", Disc Rotor Skimming, inches=17, unitCost=50000` → line **$8,500**, when
$500 × qty looks intended. Same overloaded column, different meaning. Out of scope for C5 and it
would change prices on live quotes, so flagging rather than touching it.

### C6. Back button hard-coded to the quote list **[VERIFIED]**

`floor/$quoteId.tsx:273` — `<Link to="/floor" />`, unconditionally.

- [x] `validateSearch` adds an optional `from: "floor" | "customer"`, following the same pattern
      `technician/$invoiceId` already uses for `source`
- [x] Back renders `<Link to="/customers/$customerId">` when `from=customer`, else `/floor` — still a
      semantic `<a>` with prefetch and open-in-new-tab, unlike `history.back()`

**A closed enum, not a URL.** The customer path is rebuilt from the quote's own `customerId`, so
nothing navigable comes out of the query string and there's no open-redirect surface.

**Wider than just new quotes.** Making the param typed forced every link to `/floor/$quoteId` to be
considered, which surfaced that *existing* quotes opened from the profile had the same problem —
Orane's "the user can initiate a Quote both from a customer profile and from the List of Quotes"
covers those too. All three profile links (quote number, Edit Quote, job's quote link) now pass
`from=customer`. Unrelated entry points (global search, terms redirect, discount approvals) omit it
and get the old behaviour.

_Verified in-browser:_ new quote from profile → `?from=customer`, button reads "Back to customer",
returns to the profile. Existing quote #67 from the profile → same. `/floor/$quoteId` with no param →
"Back to list" → `/floor`, unchanged.

### C7. Prepared By **[VERIFIED — fully backfillable]**

Good news: `quote.createdById` and `invoice.createdById` already exist and are `notNull`, with
relations wired (`floor.ts` `createdBy`). **No migration and no data loss** — every historical quote
already knows who prepared it. This is display-only work.

The two screenshots point at two different places:
- `3a7401dc` → customer profile **Latest Quotes** table, empty column between *Date* and *Quote #*
- `bd0c3039` → **quote screen**, empty space just above *Share Quote*

- [x] "Prepared By" column on the customer profile's Latest Quotes table, positioned exactly where
      the red box was; `colSpan` on the empty state bumped 5 → 6
- [x] Also added to the `/floor` quote list — Orane says "the Quote listing/display" and that is the
      primary one, even though the screenshot shows the profile table
- [x] "Prepared By:" block on the quote screen, between the Send Quote buttons and *Share Quote*
- [x] Both PDFs: added to the meta row beside Quote Date / Date
- [x] API: `createdBy` added to `quotes.list` (both branches) and `customers.getById`, and narrowed
      to `columns: { id, name }` everywhere — the previous `createdBy: true` on `quotes.get` shipped
      whole user rows (emails, roles) for something rendered as one line of text. Nothing consumed it
      yet, so narrowing was free.

**"Signed-in user" reading.** Orane writes "below it the signed in user name", but the same bullet
also says "the person who created the quote" and asks for it on *previous* quotes. Using the current
session would print the wrong name whenever anyone else opens an old quote, so this reads
`quote.createdBy` — the creator, captured at creation. Same value, correct for history.

**Which name goes on the invoice — a real fork.** The invoice has its own `createdById` (whoever
converted it) which is *not* always the quote's author: **2 of 24 live invoices differ** (INV-32 and
INV-37: converted by System Admin, quoted by Vas Diak). Orane's "**this** information will also be
displayed on the invoice" refers to the Prepared By he had just defined as the quote's creator, and
showing the quote's author keeps one name across both customer-facing documents. So the invoice PDF
uses `quote.createdBy`, falling back to the invoice's own creator. **Flagged for confirmation.**

_Verified:_ `pdftotext` on both PDFs shows `Prepared By  System Admin`; INV-32 correctly flipped from
"System Admin" to "Vas Diak" after the change. In-browser: column renders on the profile (including
pre-existing quote #67 — no migration needed, as predicted), section renders on the quote screen, and
10 cards on `/floor` show it.

### C3. Powder Coating blank + shows `Powder_coating` **[VERIFIED — two separate defects]**

The screenshot is **Manage → Pricing**, category filter set to Powder Coating, table empty
("No price entries yet").

1. **The label.** `pricing-tab.tsx:28-33` defines `CATEGORY_LABELS` correctly (`powder_coating:
"Powder Coating"`) and the dropdown _options_ use it — but the closed trigger renders
   `<SelectValue />`, and `ui/select.tsx:40` prints the **raw value** with a `capitalize` CSS class.
   So `powder_coating` → `Powder_coating`. This is a **shared-component defect affecting every
   Select in the app**, and the `capitalize` class is a band-aid over it.
2. **The empty table.** Powder-coat prices do not live in `servicePrice` — they live in the separate
   `powderCoatPrice` table (size range × scope × colour count), because they have a different shape.
   `seed-catalog.ts:211` only ever writes `rim`/`general`/`welding` rows to `servicePrice`. So the
   Pricing tab offers a category that **structurally can never have rows there**. It isn't missing
   data; it's the wrong table.

   Related gap: `catalog.powderPrices` has full CRUD in the API, but **no admin UI consumes it** —
   there is no powder-coat pricing screen anywhere.

- [x] `SelectValue` now forwards a `children` formatter (Base UI supports `(value) => ReactNode`);
      the Pricing tab passes `CATEGORY_LABELS`, so the closed trigger reads "Powder Coating"
- [x] Pricing tab reads `catalog.powderPrices.list` when that category is selected, mapping rows into
      the existing columns — scope + colour count read as the "Job Type", and Size Range already existed

**The data was never missing.** Neon has all 16 powder-coat prices (3 size bands × set/rim × 1–2
colours). They were invisible because the tab queried `service_price`, while powder-coat prices live
in `powder_coat_price`. Nothing had ever consumed `catalog.powderPrices`.

I left `capitalize` on `SelectValue` rather than stripping it app-wide: with a correct label passed
in it is harmless, and removing it would change every other Select at once. Other selects still
showing raw enum values (e.g. `pricing-modal`'s vehicle type / material) can adopt the same formatter
when they matter.

_Verified in-browser:_ the filter reads "Powder Coating" (was "Powder_coating") and the table lists
all 16 rows — e.g. `Per Set — 1 colour, 10"–16", $40,000.00`.

⚠️ **Read-only for now.** Edit / Delete / Add Price are hidden for this category: `PricingModal`
edits the `service_price` shape (category, job type, vehicle, material), which does not fit
size-range × scope × colour-count. `catalog.powderPrices` already exposes create/update/delete, so a
dedicated editor is a contained follow-up — flagged rather than silently assumed.

---

## Phase 3 — Cashier & Payments

### C9. Coins/cents dropped from the payment total **[VERIFIED — exact line]**

`cashier/$invoiceId/checkout.tsx:196-201`:

```js
const count = parseInt(cashCounts[denom.value] || "0", 10); // ← parseInt
if (isNaN(count) || count < 0) return sum;
if (denom.value === 0) return sum + count; // coins row
```

The "Coins" row is a **dollar amount**, not a count × denomination like every other row — but it's
parsed with `parseInt`. Type `0.60` and `parseInt("0.60", 10)` returns `0`. That is exactly Orane's
report: `$8,177.60` entered, the `.60` vanishes, Total Due never reaches `$0`.

- [x] `parseFloat` for the coins row, `parseInt` for note counts — the two are now distinguished by
      an explicit `isAmount` flag rather than the `value === 0` sentinel that caused the confusion
- [x] The coins `<input type="number">` had no `step`, so it defaulted to `step=1` and the browser
      actively fought decimal entry. Now `step="0.01"` on that row only
- [x] Dropped the misleading `×` prefix on the coins row — it is an amount, not a multiplier
- [x] Settle in integer cents, rounding each tender exactly as `handleConfirm` does

**Second, sharper bug found while fixing this.** `isOverpaying` *disables the Confirm button*
(line 450). It compared dollar floats, so an exact payment could evaluate
`8177.600000000001 > 8177.60` and lock the cashier out of a correctly-entered payment. Now compared
in integer cents. The old code's own total was already surfacing drift — the pre-fix due figure
computes to `-0.6000000000003638`, not `-0.60`.

_Verified by replaying Orane's exact figures:_

| | cash total | total due |
|---|---|---|
| before | `8177` — `parseInt("27.60")` → `27` | `-0.60`, unreachable zero |
| after | `8177.60` | **exactly `0`** |

### C8. Payment UI redesign + change due **[NEW BUILD]**

There is **no deposit logic anywhere in the codebase** — no 50%, no deposit concept. `totalDue` at
line 203 is actually the overpayment delta and is misnamed. This is a build, not a tweak.

- [x] `checkout.tsx` rebuilt to the mockup: two columns, numbered steps
      ① *Amount to collect* / ② *Payment method*, and a sticky Payment Summary panel
- [x] Change due to customer, shown in both the tender bar and the summary
- [x] 50% deposit is the default, badged "Recommended"

**The mockup pins down the model, including two things that invert the old code.**

*Change is measured against the amount being collected, not the balance.* Its own numbers confirm it:
$8,177 balance → 50% = $4,088.50; $4,100 cash → change **$11.50** (= received − collect, not
received − balance); remaining **$4,088.50**.

*The cash breakdown is a counting aid, not the source of truth.* It is labelled "(optional)" and in
the mockup sums to $4,210 against $4,100 received — deliberately not reconciled. So **"Cash amount
received" is authoritative**; the breakdown totals the drawer and fills that field, which can then be
typed over. Previously the breakdown *was* the amount, which is what made the coins bug (C9) possible
in the first place.

**What gets recorded is what is applied, not what was handed over.** With $4,100 cash for a $4,088.50
deposit, the recorded payment is $4,088.50 — the change comes back out of the cash tender so the
entries always sum to exactly the collected amount. The old code recorded the full tender.

**Guard: change can only come from cash.** A card/cheque/transfer overshoot cannot be handed back —
without this the cash entry computes negative. Blocked with an explanation rather than silently
mis-recorded.

### C10. Deposit override **[done with C8]**

- [x] Full balance / 50% deposit / Custom amount, custom accepting any value up to the balance —
      including **lower** than 50%, which is what Orane asked for
- [x] Discount applies *before* the deposit is derived, so "50%" is half of what is actually owed

_Verified — arithmetic across six scenarios (mockup case, exact full payment, low custom deposit,
mixed tender with change, card overshoot, discount-then-deposit); recorded entries summed to the
collected amount in every one. In-browser on INV-0019 ($9,502): 5 × $1,000 notes auto-filled
"received" to $5,000.00, change **$249.00**, remaining $4,751.00; custom $1,000 gave payment today
$1,000.00 and remaining $8,502.00; a $9,000 card tender with no cash disabled Complete Payment with
"Change can only be given from cash". No real payment was submitted — that would mutate live data._

### C11. Quotes sent to Cashier don't appear **[VERIFIED — root cause found]**

`packages/api/src/routers/cashier.ts:37-44` filters the invoice list by **the creator's profile
location**:

```js
inArray(
  invoice.createdById,
  db.select({ id: user.id }).from(user).where(eq(user.locationId, locId)),
);
```

`user.locationId` is the creator's _primary_ location — `setUserLocations` sets it to
`locationIds[0]`. It is neither the location the invoice was raised at, nor the full set of
locations the user belongs to (`userLocation`). So a floor manager assigned to [A, B] with primary A
raises an invoice while the cashier is signed into B → **the invoice is invisible, at any date
range.** That matches "I removed the filter and set to All time but nothing is listed" exactly, and
explains the intermittency (it depends on who raised it).

The real defect is inferring an invoice's location from a mutable user field.

- [x] `locationId` added to `quote` and `invoice` (nullable, FK → `location`, indexed)
- [x] Stamped from `context.locationId` at quote creation; the invoice **inherits it from the quote**
      rather than re-deriving it, so the two can never disagree
- [x] All three filters now read the record's own branch
- [x] Migration `0012_swift_iron_fist.sql` generated, with backfill SQL appended
- [ ] **Migration not yet run against Neon — needs your go-ahead** (see below)

**This was systemic, not one screen.** The same defective pattern appeared in **three** routers:

| file | list | status |
|---|---|---|
| `cashier.ts:41` | invoices | fixed |
| `floor.ts:337` | quotes | fixed — same bug, unreported |
| `dashboard.ts:244` | latest invoices | fixed — same bug, unreported |

`dashboard.ts:207` also filters by `user.location_id`, but that one filters *technicians* by their
home branch, which is legitimate. Left alone.

**Live proof (Neon, 2026-08-17).** 23 of 24 invoices were raised by `admin`, who is assigned to
**both** branches but whose profile primary is Hagley Park. So a cashier signed into **Main Office**
could see exactly **one** invoice (#27) — every other one was filtered out. Not intermittent at all;
it was near-total, and precisely matches "I sent this Quote to Cashier, but nothing happened… I even
removed the filter and set to All time but nothing is listed."

**Design note.** The filter is `locationId = current OR locationId IS NULL`. An unstamped row shows
at every branch instead of none. That asymmetry is deliberate: a record at the wrong branch is a
nuisance someone reports, a record at no branch is the bug being replaced.

_Verified: `tsc --noEmit` clean across all four packages, `oxlint` 0 errors, `bun run build` passes._

---

## Phase 4 — Technician

### C12. Single multi-file upload with Before/After tags — **DEFERRED (not this round)**

> Skipped at the user's direction on 2026-08-17: _"for now don't implement it, gonna look at it
> separately."_ Leaving the finding recorded so the next round starts informed.

`upload-proofs-dialog.tsx` has no mutation — it is presentational only: it collects files into React
state and discards them when the dialog closes. `job.proofVideoUrl` is one nullable text column,
which cannot hold a tagged set of images and videos. Whoever picks this up needs storage (D1) plus a
`job_proof` table (`jobId`, `url`, `mediaType`, `tag`, `uploadedById`, `createdAt`).

**Do not touch `upload-proofs-dialog.tsx` in this round.**

### C13. Complete Job action **[VERIFIED — partially exists]**

`CompleteJobDialog` exists and is correct: it verifies the PIN via
`technician.jobs.verifyPin` and calls `jobs.complete`. But it is only rendered from `job-card.tsx:52`
and only when `getGroupAction(group) === "done"` — i.e. when _no_ job is still `accepted`
(`use-jobs.ts:61-63`). `job-detail-view.tsx:141` offers only the upload dialog. So from the detail
view there is genuinely no way to complete a job, which is what Orane hit.

**Worse than the plan assumed — it was unreachable from both screens, for three reasons.**

1. The detail view *did* have a Done button, but it was a bare `<Button color="success">` with **no
   `onClick`**. Purely decorative.
2. It was gated on `job.status === "in_progress"` — and **nothing in the codebase ever writes that
   status.** Jobs go `pending → accepted → completed` (`job.service.ts:78`). Live data confirms:
   `pending 3, accepted 2, completed 1`, zero `in_progress`. So it never rendered either.
3. On the list card, `getGroupAction` returned `"proofs"` XOR `"done"`, and `accepted` is the normal
   state — so Complete only appeared once nothing was left to complete.

- [x] `CompleteJobDialog` takes optional `jobIds` so the detail view completes a single row while the
      card still completes the whole invoice; the PIN is verified against the technician assigned to
      *those* jobs, not whoever happened to be first in the group
- [x] Detail view's dead button replaced with the real dialog, shown via a shared `isCompletable`
      (accepted **or** in_progress) instead of the unreachable `in_progress`-only check
- [x] Card renders Proofs on its existing condition and Complete on its own — they are no longer
      alternatives. Proofs' reach is unchanged, so the deferred C12 dialog gains no new exposure
- [x] `isCompletable` / `canCompleteGroup` live in `use-jobs.ts` so card and detail can't drift

_Verified in-browser:_ card now shows Proofs **and** Done for accepted jobs; detail view shows Done on
the `Accepted` row where nothing was before; the dialog opens with Notes + Technician Code, and a
wrong PIN (`0000`) leaves the row `Accepted` with the DB unchanged at `pending 3, accepted 2,
completed 1` — the PIN gate holds. I did not complete a real job, since that would mutate live data.

### C14. View job proofs — **DEFERRED (not this round)**

Downstream of C12 — there is nothing to view until uploads persist. Deferred with it.

---

## Phase 5 — Send Quote

### C16. Send Quote modal with channel choice **[VERIFIED]**

Both the customer page and the quote page call the same `floor.quotes.send`, which reads
`communicationPreference` server-side (`floor.ts:705`) with no override. The reported inconsistency
is most likely a stale customer record on one of the two pages — but the fix Orane asked for makes
it moot.

**The screenshots explain the "inconsistency" — it was a lying label.**
`b8fbd989` shows the confirm dialog saying *"You are about to send the quote to customer via
**email**"*. That string was hardcoded in **both** dialogs
(`customers/$customerId.tsx:772`, `floor/$quoteId.tsx:873`) regardless of the customer's actual
preference. The backend already honoured the preference, so it was telling Orane "email" while
sending SMS. `ec7e1e25` shows the real failure underneath: a toast reading
**"Failed to send: Failed to send SMS"** — which is C15, not a routing bug.

- [x] `channel: "email" | "sms"` added to `floor.quotes.send`; omitted, the stored preference wins
- [x] New shared `components/floor/send-quote-dialog.tsx` replaces both hand-rolled dialogs — one
      send path, so the two entry points cannot disagree again
- [x] Defaults to the preferred channel, marked with a "Preferred" badge
- [x] Each option shows the address it would send to; a channel with no address is disabled and reads
      "No email on file" / "No mobile number on file"
- [x] Auto-falls back to whichever channel has an address when the preferred one does not

_Verified in-browser:_ from the customer profile, the modal opens with SMS pre-selected and badged
Preferred (matching the profile toggle), both addresses shown. For a customer with no email, the
Email option is disabled and greyed with "No email on file".

⚠️ **Not exercised:** the auto-fallback branch. **Zero live customers have an unavailable preferred
channel** — `customer.phone` is `notNull` in the schema so SMS always has an address, and no
`pref=email` customer currently lacks an email. The branch is implemented and typechecked but I
could not drive it with real data, and I chose not to mutate a production record to force it.

### C15. SMS/Email not sending **[NEEDS REPRO — likely ops, not code]**

`RESEND_API_KEY` and `EASYSENDSMS_API_KEY` are both `z.string().min(1)` in
`packages/env/src/server.ts`, so the app cannot even boot without them. The send path itself looks
correct. That points at provider-side config: unverified Resend sending domain, or an unapproved
EasySendSMS sender ID / exhausted credits.

**EMAIL IS CONFIRMED WORKING** (user sent a real quote, 2026-08-17). Quote #72 arrived from
`admin@rimgenie.com` with the PDF attached. Resend is configured and delivering — half of C15 is
simply not a defect.

The delivered email did expose two rendering bugs, now fixed:

- [x] **Broken logo.** `<img src="{baseUrl}/logo.png">` where `baseUrl` is `BETTER_AUTH_URL` —
      `http://localhost:3000` in this env, which no mail client can fetch. Now attached inline by
      `EmailService.send` and referenced as `cid:rimgenie-logo`, so it travels with the message and
      no longer depends on any env var being publicly reachable. `baseUrl` is gone from all four
      templates and their callers.
- [x] **"Subtotal$2,800.00".** `styles.row` used `display:flex` + `justify-content:space-between`.
      **Gmail strips flexbox**, so the label and value spans collapsed together. Replaced with
      table-based `Row` / `TotalRow` in `email-layout.tsx`; all four templates migrated.

_Verified by rendering each template to HTML: no `display:flex` remains, the logo emits
`src="cid:rimgenie-logo"`, and rows now read `Subtotal  |  $2,800.00` in separate cells._

- [x] **Surface the provider's reason.** `run-effect.ts` mapped `SmsSendFailed` to the fixed string
      "Failed to send SMS", throwing away `error.reason` — which is where EasySendSMS's actual
      complaint lives. That is why the only diagnostic anyone had was a message that says nothing.
      Send failures now append the provider's reason.

⚠️ **SMS remains unconfirmed.** Config looks present (`EASYSENDSMS_SENDER="RimGenie"`, 32-char key).
I probed the provider's balance endpoint read-only (no message sent) and got HTTP 429 — but **a
deliberately bogus key returned the same 429**, so the rate limit is IP-level and the probe proves
nothing either way. Determining this needs one real send to a real handset, which is outward-facing
and wants explicit approval. The error-message fix above means that attempt will now report *why*
rather than "Failed to send SMS".

---

## Phase 6 — Global UI

### C17. Fixed menu, content-only scroll, site-wide **[VERIFIED — different cause than expected]**

The shell in `_app.tsx` is already correct (`h-svh`, `overflow-hidden` on the row, `overflow-y-auto`
on `main`). The actual problem is line 21:

```js
const hideSidebar = Object.keys(params).length > 0;
```

**The sidebar is removed entirely on every route with a path param** — `/floor/$quoteId`,
`/cashier/$invoiceId`, `/customers/$customerId`, `/technician/$invoiceId`. Those are precisely the
screens where Orane loses navigation. It was never a scroll bug.

- [x] ~~Sidebar kept on detail routes~~ — **REVERTED at the user's request (2026-08-17): not wanted.**
      `_app.tsx` is back to its original state, `hideSidebar` and all. Detail routes show no sidebar,
      exactly as before.
- [x] Manage page's inner nav pinned (`lg:sticky lg:top-0 lg:self-start`) — kept

**Scope correction (2026-08-17).** I initially read "the menu" as the left app sidebar. The
screenshot attached to the `## Standardize menu` section is actually the **Inventory page**, with the
red box around its *page header and tab row* (Overnight / Ready For Pickup / …). "Navigate between
sections" means switching tabs. The sidebar work above is still correct — it satisfies the
description's earlier *"Freeze the navigation menu … site-wide"* item, and the sidebar was being
removed outright on detail routes — but it is not what this screenshot marks.

The actual ask, now done: **page header + tabs pinned while only the list scrolls**, applied
site-wide per "This must be applied site wide":

- [x] `inventory.tsx` — the screen in the screenshot
- [x] `cashier/index.tsx` — same header/tabs pattern
- [x] `technician/index.tsx` — same, incl. the animated tab indicator
- [x] `manage.tsx` — section nav (done above)

Header and tabs are wrapped in one sticky block with negative margins so the background bleeds over
the page padding — without that, rows show through the gap as they pass underneath.

**Background fix (user-reported).** I first used `bg-page` (`#f4f7fa`), which left the header a
visibly different shade from the page. Measured: block `rgb(244,247,250)` vs `body` `oklch(1 0 0)`.
`--page` is only used for small fills (skeletons, hover states) — the actual page surface is
`--background`. All three now use `bg-background`; re-measured as an exact string match to `body`.

**Mobile guard.** With `_app.tsx` reverted, the horizontal nav is once again `sticky top-0 z-20`
*inside* `<main>`, so an unconditional `sticky top-0` on my block (z-10) hid the header behind it
below `md` — measured overlap: nav `64–129`, block `64–185`. Stickiness is therefore scoped
`md:sticky md:top-0`. Tablets (the stated target device) get it; phones scroll the header normally
and keep the sticky app nav.

_Verified in a real browser:_
- `/manage?tab=job-types`: scrolled 900px, section nav held at `top: 64px`.
- `/inventory`, `/cashier` @1024: scrolled 500–700px, header `top` unchanged at `64` / tablist at
  `132`; background an exact match to `body`.
- `/inventory` @420: `position: static`, header scrolls away, no overlap with the app nav.
- `/technician`: renders correctly after the wrapper restructure, tab indicator intact.

### C18. Label colors default to blue **[VERIFIED]**

`customers/$customerId.tsx:71-73` maps `pending → bg-blue` and `accepted → bg-blue`; `floor/index.tsx:40`
does the same. A `bg-badge-orange` token already exists, so a small palette is established.

- [x] Distinct colour per status. No new tokens were needed — a full badge palette already existed
      in `index.css` (`badge-blue/cyan/green/orange/magenta/red`) and only `badge-orange` was ever
      used
- [x] One shared `StatusBadge` in `components/ui/status-badge.tsx`; the two duplicated copies in
      `floor/index.tsx` and `customers/$customerId.tsx` deleted

| status | before | after |
|---|---|---|
| draft | `bg-ghost` | `bg-ghost` |
| pending | `bg-blue` | `bg-badge-blue` |
| accepted | `bg-blue` — same as pending | `bg-badge-cyan` |
| in_progress | `bg-badge-orange` | `bg-badge-orange` |
| completed | `bg-green` | `bg-badge-green` |

The `discount-approvals` badge is a different domain (approval state, pill style) and was left alone.

### C19. Whole label + checkbox clickable **[VERIFIED]**

`ui/checkbox.tsx` renders a bare Base UI `Root` with no label association, and call sites are
inconsistent — `job-type-modal`, `colors-tab`, `vehicle-sizes-tab` use the shared component, while
`customer-modal:347`, `add-new-client-dialog:265` and `quote-generator-sheet:121` hand-roll their own
`CheckboxPrimitive.Root`.

**Narrower than the plan assumed.** I checked every checkbox call site: `job-type-modal`,
`customer-modal` and `add-new-client-dialog` were *already* correctly wrapped in `<label>`, and the
Steel/Aluminum radios in the same screenshot were fine too. Only `FloorCheckbox` in the quote
generator was broken — which is exactly what Orane's red box marked. No site-wide migration needed.

- [x] `FloorCheckbox` takes an optional `label` and renders it inside a `<label>`; all three call
      sites pass it and their sibling `<span>` is gone
- [x] `className="flex-1"` so the hit area spans the row, matching the red box in the screenshot

_Verified in-browser: clicking the text "Build Up" alone flipped `aria-checked` `false` → `true`._

### C21. Tablet accessibility — "+ Add Job" as a centered primary button **[VERIFIED]**

From the screenshot: on the quote screen, _Services to be Conducted_ → the `+ Add Job` control is a
small left-aligned link-style button. On a tablet it's a hard target. Orane wants it promoted to a
primary button and centered.

- [x] `floor/$quoteId.tsx` — `+ Add Job` is now a centered primary `Button` (was a link-style
      `<button>` with a bare text class). Kept as a native button, not a `render={<Link/>}`, since it
      opens a sheet rather than navigating

_Verified in-browser at 1024×768: renders as a centered blue primary button._

---

## Phase 7 — Reply to Orane (no code)

### C20. Error logging + DB connection details

- [ ] Document where logs live (Vercel runtime logs) and how to reach them
- [ ] Send DB connection details through a secure channel — **not** a Linear comment
- [ ] If there's no structured error logging yet, say so and propose Sentry

---

## Verification

Per CLAUDE.md, no item is done until it's proven. There is no test framework in this repo, so:

- `bun run check-types` and `bun run check` after every phase
- `bun run build` before hand-off
- Live click-through on the deployed app for C1, C5, C9, C11, C15 — the five where the cause is
  either data-dependent or provider-dependent
- Report results honestly, including anything that stays broken

## Order of work

1. **Phase 1 (C1)** — the client's team is testing right now and locked-out users block everything
2. **Phase 3 (C9, C11)** — two verified data-correctness bugs; C9 is a one-line fix
3. **Phase 6 (C17, C18, C19, C21)** — cheap, visible, site-wide
4. **Phase 2 (C4, C6, C7)** — contained front-end work
5. **Phase 5 (C16)**, then **C5/C3** pending the DB check
6. **C13** (small, independent), then **C8/C10** — the payment build
7. **C2** — invite flow, gated on C15 proving the email channel actually works

**Deferred out of this round:** C12, C14 (job proof uploads + viewing) — being handled separately.

---

## Review

_(to be filled in as work completes)_
