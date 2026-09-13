# SalonBook QA automation (Playwright)

Broader end-to-end coverage for the salon booking system (local or staging).

## Coverage

Run the inventory **before** the suite (also runs automatically at the start of
`pnpm test:e2e:isolated`):

```bash
pnpm test:e2e:coverage
```

Writes `e2e/COVERAGE.md` and `playwright-report/coverage-inventory.json`.

| Spec | Flows |
|------|--------|
| `smoke.spec.ts` | Home, demo hub, book page, floor display |
| `booking.spec.ts` | Full client booking; new service → stylists |
| `booking-edges.spec.ts` | Book another, website link, step chips |
| `salon-day.spec.ts` | Book → display check-in → stylist Done → admin list |
| `guest-booking-visibility.spec.ts` | Guest book visible on manager/stylist/display |
| `admin.spec.ts` | Admin login, services, book-for-client page, bad password |
| `admin-book.spec.ts` | Admin creates booking; products & stylists pages |
| `admin-bookings-filter.spec.ts` | Filters + mark no-show |
| `admin-promotions.spec.ts` | Discount rules |
| `admin-pay.spec.ts` / `admin-store-earnings.spec.ts` | Payroll + store earnings |
| `dashboard-summary.spec.ts` | Earnings goal ring + today mix |
| `checkout-promotions.spec.ts` | Member discount at reception |
| `walk-in.spec.ts` | Walk-in / waitlist / checkout |
| `reception-auth.spec.ts` | Reception login, menus, calendar, DnD |
| `display-pin.spec.ts` | Display PIN set/unlock |
| `display-redirect.spec.ts` | `/display/:slug` → lounge/scheduler |
| `stylist.spec.ts` | Stylist login, FHSalon, Schedule nav |
| `stylist-schedule.spec.ts` | Mark leave + remove; save work days |
| `stylist-earnings.spec.ts` / `stylist-photo.spec.ts` / `stylist-accounts.spec.ts` | Earnings, selfie, issued logins |
| `manager-photo.spec.ts` / `manager-stylist-schedule.spec.ts` | Manager selfie + stylist schedule |
| `auth.spec.ts` | Redirects, bad password, role routing, logout |
| `mobile.spec.ts` | iPhone viewport: book, stylist nav, demo hub |
| `explore-discovery.spec.ts` | Explore API filters + UI controls |
| `explore-business.spec.ts` | Business detail, Book deep link, favorites |
| `marketplace-lifecycle.spec.ts` | Claim → approve → Explore → pause |
| `consumer-account.spec.ts` | Account API profile/favorites/cancel |
| `consumer-account-ui.spec.ts` | Account OTP UI + tabs |
| `member-auth.spec.ts` / `look-book.spec.ts` / `client-profile.spec.ts` | Member booking + BeautyAI |
| `multi-salon/*` | Platform console, isolation, public apps, earnings |

Still out of scope: Google Calendar OAuth, card payment processors, Netlify marketing HTML.

## Prerequisites

1. Chromium for Playwright:

```bash
pnpm exec playwright install chromium
```

2. For **isolated** runs (recommended): no Neon/live DB needed — a local throwaway Postgres is started automatically.
3. For runs against an existing DB: `platform/.env` `DATABASE_URL` + `pnpm db:seed` (avoid production).

## Run (isolated — does not touch live Neon)

```bash
cd platform

pnpm test:e2e:coverage            # show coverage inventory only
pnpm test:e2e:isolated            # prints coverage, then full suite (headless)
pnpm test:e2e:full                # coverage report + isolated suite
pnpm test:e2e:isolated:headed     # same, headed browser
pnpm test:e2e:report              # open HTML report
```

## Run (against current DATABASE_URL — use carefully)

```bash
pnpm db:seed
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

Staging (also mutates that environment’s DB — do not use production):

```bash
PLAYWRIGHT_BASE_URL="https://your-staging.vercel.app" pnpm test:e2e:headed
```
