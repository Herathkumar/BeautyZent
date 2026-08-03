# SalonBook QA automation (Playwright)

End-to-end tests cover the main salon flows against your local app + database.

## What is covered

| Spec | Flows |
|------|--------|
| `smoke.spec.ts` | Home, demo hub, book page, floor display |
| `booking.spec.ts` | Full client booking; new service → stylists still appear |
| `admin.spec.ts` | Admin login, services, book-for-client, bad password |
| `stylist.spec.ts` | Stylist login, My Day, Away & hours |

## Prerequisites

1. `platform/.env` has a working `DATABASE_URL` (Neon or local Postgres)
2. Seeded demo data: `pnpm db:seed`
3. Chromium installed once (in your own terminal, not only via Cursor):

```powershell
pnpm exec playwright install chromium
```

If you see `Executable doesn't exist ...\ms-playwright\...`, run that install command again.

## Run

```powershell
cd C:\Users\hkathira\a3-it-solutions\platform

# Starts (or reuses) http://localhost:3000 and runs all tests
pnpm test:e2e
```

Other modes:

```powershell
pnpm test:e2e:headed   # watch the browser
pnpm test:e2e:ui       # Playwright interactive UI
pnpm test:e2e:report   # open the HTML report after a run
```

Point at another URL (e.g. Vercel staging):

```powershell
$env:PLAYWRIGHT_BASE_URL="https://fhsalon.vercel.app"
pnpm test:e2e
```

## Report

After `pnpm test:e2e`, open:

- HTML: `playwright-report/index.html` via `pnpm test:e2e:report`
- JSON: `playwright-report/results.json`
- Failed runs keep screenshots/video under `test-results/`

## Tips

- Keep demo passwords (`demo1234`) for local/staging QA only.
- Booking tests pick the next weekday and the first open slot.
- If booking fails with “no slots”, check stylist hours / leave blocks in admin.
