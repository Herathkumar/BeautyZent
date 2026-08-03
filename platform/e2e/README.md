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
| `stylist.spec.ts` | Stylist login, My Day, Away nav |
| `stylist-schedule.spec.ts` | Mark leave + remove; save work days |
| `auth.spec.ts` | Redirects, bad password, role routing, logout |
| `mobile.spec.ts` | iPhone viewport: book, stylist nav, demo hub |

Still out of scope: Google Calendar OAuth, multi-tenant slugs, Netlify marketing HTML, payment.

## Prerequisites

1. `platform/.env` has a working `DATABASE_URL`
2. Seeded demo data: `pnpm db:seed`
3. Browsers (run in **your** terminal):

```powershell
pnpm exec playwright install chromium
```

## Run

```powershell
cd C:\Users\hkathira\a3-it-solutions\platform

pnpm test:e2e            # headless + HTML report
pnpm test:e2e:headed     # watch the browser
pnpm test:e2e:ui         # interactive runner
pnpm test:e2e:report     # open last HTML report
```

Staging:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://fhsalon.vercel.app"
pnpm test:e2e:headed
```
