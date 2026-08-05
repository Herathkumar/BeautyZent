# SalonBook QA automation (Playwright)

Broader end-to-end coverage for the salon booking system (local or staging).

## Coverage

| Spec | Flows |
|------|--------|
| `smoke.spec.ts` | Home, demo hub, book page, floor display |
| `booking.spec.ts` | Full client booking; new service → stylists |
| `booking-edges.spec.ts` | Book another, website link, step chips |
| `salon-day.spec.ts` | Book → display check-in → stylist Done → admin list |
| `admin.spec.ts` | Admin login, services, book-for-client page, bad password |
| `admin-book.spec.ts` | Admin creates booking; products & stylists pages |
| `stylist.spec.ts` | Stylist login, ZLab-Salon, Schedule nav |
| `stylist-schedule.spec.ts` | Mark leave + remove; save work days |
| `auth.spec.ts` | Redirects, bad password, role routing, logout |
| `mobile.spec.ts` | iPhone viewport: book, stylist nav, demo hub |

Still out of scope: Google Calendar OAuth, multi-tenant slugs, Netlify marketing HTML, payment.

## Prerequisites

1. Chromium for Playwright:

```powershell
pnpm exec playwright install chromium
```

2. For **isolated** runs (recommended): no Neon/live DB needed — a local throwaway Postgres is started automatically.
3. For runs against an existing DB: `platform/.env` `DATABASE_URL` + `pnpm db:seed` (avoid production).

## Run (isolated — does not touch live Neon)

```powershell
cd C:\Users\hkathira\a3-it-solutions\platform

pnpm test:e2e:isolated            # headless against local Postgres + demo seed
pnpm test:e2e:isolated:headed     # same, headed browser
pnpm test:e2e:report              # open HTML report
```

## Run (against current DATABASE_URL — use carefully)

```powershell
pnpm db:seed
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

Staging (also mutates that environment’s DB — do not use production):

```powershell
$env:PLAYWRIGHT_BASE_URL="https://your-staging.vercel.app"
pnpm test:e2e:headed
```
