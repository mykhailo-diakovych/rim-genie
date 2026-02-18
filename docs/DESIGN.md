# Rim Genie Design System

Reference document for Claude Code agents and developers implementing UI.

## Figma Source

- **File**: https://www.figma.com/design/9CDKeG6Zam6ScDzWbPALyu/Rim-Genie-App
- **Email Login screen**: node `9:2182`
- **Staff Login screen**: node `9:2141`
- **Reset Pin modal**: node `9:3601`
- **Logo**: node `9:2186`

---

## Typography

| Token          | Font           | Weight | Size   | Line Height | Usage            |
| -------------- | -------------- | ------ | ------ | ----------- | ---------------- |
| `font-rubik`   | Rubik Variable | varies | varies | varies      | All UI text      |
| `font-poppins` | Poppins        | 400    | 12px   | 18px        | Footer copyright |

**Rubik weights used:**

- Regular (400) — body, labels, inputs, buttons
- Medium (500) — headings (page title, modal title)

---

## Design Tokens

Defined in `apps/web/src/index.css` (`:root` + `@theme inline`). App-wide — not scoped to auth.

| CSS Variable    | Hex       | Tailwind Classes                      | Usage                          |
| --------------- | --------- | ------------------------------------- | ------------------------------ |
| `--blue`        | `#1583e4` | `bg-blue`, `text-blue`, `border-blue` | Primary action, active toggle  |
| `--green`       | `#21b84e` | `bg-green`, `text-green`              | Success button                 |
| `--red`         | `#f04438` | `text-red`, `border-red`              | Validation errors              |
| `--page`        | `#f4f7fa` | `bg-page`                             | Page / layout background       |
| `--card-line`   | `#ebf0f5` | `border-card-line`                    | Card borders, footer separator |
| `--field-line`  | `#ebedf0` | `border-field-line`                   | Input borders                  |
| `--toggle-line` | `#e1e9eb` | `border-toggle-line`                  | Segmented control border       |
| `--body`        | `#2b2d2e` | `text-body`                           | Primary body text              |
| `--label`       | `#686b6c` | `text-label`                          | Labels, secondary text         |
| `--ghost`       | `#b3bbc2` | `text-ghost`                          | Placeholders, icon defaults    |
| `--dim`         | `#54687a` | `text-dim`                            | Footer / muted text            |

---

## Spacing & Sizing

| Element                      | Value                                |
| ---------------------------- | ------------------------------------ |
| Card max-width               | `368px` (`max-w-[368px]`)            |
| Card border-radius           | `12px` (`rounded-[12px]`)            |
| Card padding                 | `px-6 py-4` (24px / 16px)            |
| Card shadow                  | `0px 2px 8px rgba(116,117,118,0.04)` |
| Input / Button height        | `36px` (`h-9`)                       |
| Input / Button border-radius | `8px` (`rounded-[8px]`)              |
| Input padding                | `p-2` (8px)                          |
| Toggle outer radius          | `8px`, inner tab radius `6px`        |
| Toggle tab width             | `72px`                               |
| Form gap                     | `24px` between title and fields      |
| Field gap                    | `12px` between fields                |
| Label-to-input gap           | `4px`                                |
| Footer height                | `40px`                               |
| Modal max-width              | `340px`                              |
| Modal border-radius          | `12px`                               |

---

## Component Inventory

### Generic UI components — `components/ui/` (styled with `tailwind-variants`)

#### `Button`

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" fullWidth>Log In</Button>
<Button variant="success">Reset</Button>
<Button variant="ghost">Cancel</Button>
```

| Variant                                          | Appearance                 | Notes                               |
| ------------------------------------------------ | -------------------------- | ----------------------------------- |
| `default`                                        | `bg-blue` white text       | Use `fullWidth` prop for full-width |
| `success`                                        | `bg-green` white text      | Fixed `w-[128px]`                   |
| `ghost`                                          | No background, `text-body` | Auto width                          |
| `outline` / `secondary` / `destructive` / `link` | Dark-theme variants        | For app shell use                   |

#### `Input`

```tsx
import { Input } from "@/components/ui/input";

<Input
  type="email" // "text" | "password" | "email" | "number"
  value={value}
  leadingIcon={<Mail className="size-4" />}
  error={hasError} // red border + alert icon
  onChange={handler}
  onBlur={handler}
/>;
```

Password type automatically adds eye toggle. Error + password: red border only (no alert icon).

#### `Label`

```tsx
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email:</Label>;
```

Rubik 12px, `text-label` color. Standard HTML `<label>` semantics.

#### `SegmentedControl`

Generic tab toggle — not email/staff specific.

```tsx
import { SegmentedControl } from "@/components/ui/segmented-control";

const TABS = [
  { value: "email" as const, label: "Email" },
  { value: "staff" as const, label: "Staff" },
];

<SegmentedControl tabs={TABS} value={tab} onChange={setTab} />;
```

#### `PinInput`

Six-digit PIN with auto-advance, backspace, paste support.

```tsx
import { PinInput } from "@/components/ui/pin-input";

<PinInput value={pin} onChange={setPin} error={hasError} />;
```

---

### Domain components — `components/auth/`

Auth-specific form logic. These compose generic UI primitives.

- **`EmailLoginForm`** — TanStack Form, email + password, calls `authClient.signIn.email()`
- **`StaffLoginForm`** — TanStack Form, Employee ID + PinInput, placeholder handler
- **`ResetPinModal`** — Base UI Dialog, Old/New/Confirm PIN with validation

```tsx
<ResetPinModal trigger={<button>Reset PIN</button>} />
```

---

## Layout Routes

| Route File                  | URL          | Description                                        |
| --------------------------- | ------------ | -------------------------------------------------- |
| `routes/__root.tsx`         | (all)        | Minimal HTML shell, no layout                      |
| `routes/_app.tsx`           | `/_app/*`    | App shell with `<Header />`, `h-svh` grid          |
| `routes/_auth.tsx`          | `/_auth/*`   | Auth shell: centered card, sticky footer, light bg |
| `routes/_app/index.tsx`     | `/`          | Home / API status                                  |
| `routes/_app/dashboard.tsx` | `/dashboard` | Protected dashboard                                |
| `routes/_auth/login.tsx`    | `/login`     | Login page                                         |

`_` prefix in file names = pathless layout group (invisible in URL).

---

## Responsive Behavior

| Breakpoint            | Card                     | Page padding               |
| --------------------- | ------------------------ | -------------------------- |
| `< 480px` (mobile)    | `w-full` fills viewport  | `px-4` from `_auth` layout |
| `480–1024px` (tablet) | `max-w-[368px]` centered | `px-4`                     |
| `> 1024px` (desktop)  | `max-w-[368px]` centered | `px-4`                     |

The `_auth` layout uses `flex items-center justify-center px-4 py-8` to center the card vertically and horizontally with safe gutters on small screens.
