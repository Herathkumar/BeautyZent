# SalonBook platform — deploy without touching live fhsalon.ca

Live marketing site stays on Netlify **`main`** (static HTML).  
Online booking lives on branch **`feature/online-booking`** under `/platform`.

## What you get

| Surface | URL (local) | Purpose |
|---------|-------------|---------|
| Client booking | `/book/fhsalon` | Mobile-friendly online reservation (no app) |
| Tablet display | `/display/fhsalon` | Salon floor board + check-in |
| Admin | `/admin` | Services, prices, products, stylists, bookings |
| Calendar sync | Google OAuth + ICS feed | Bookings on stylists’ phone calendars |
| Stylist portal | `/stylist` | Stylists manage own bookings, hours, leave |
| Admin schedule | Admin → Stylists → Manage schedule | Admin can set hours/leave for any stylist |
| Admin book | Admin → Book for client | Front desk books a client onto a stylist |

Multi-tenant: each salon is a `Salon` row with a unique `slug` (pilot: `fhsalon`).

## Local run

```powershell
cd C:\Users\hkathira\a3-it-solutions
git switch feature/online-booking
cd platform
pnpm install
pnpm db:setup
pnpm dev
```

- Open http://localhost:3000  
- Admin: `admin@fhsalon.ca` / `demo1234`

## Google Calendar (phone sync)

1. Create a Google Cloud OAuth client (Web application).
2. Add redirect URI: `https://YOUR-APP/api/calendar/google/callback`
3. Set env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
4. In Admin → Stylists → **Connect Google Calendar** for each stylist.

Until Google is configured, each stylist has an **ICS subscribe URL** that Apple Calendar / Google Calendar can add on their phone.

## Staging deploy (recommended: Vercel) — does not change Netlify live site

1. Import **Herathkumar/fhsalon** into [Vercel](https://vercel.com).
2. Set **Root Directory** to `platform`.
3. Set **Production Branch** to `feature/online-booking` (or a `staging` branch).
4. Add env vars:
   - `DATABASE_URL` — use Vercel Postgres / Neon / Supabase Postgres for staging
   - `AUTH_SECRET` — long random string
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL
   - `NEXT_PUBLIC_DEFAULT_SALON_SLUG=fhsalon`
   - Google vars when ready
5. Deploy. Run seed once (`pnpm db:seed` against the staging DB, or a one-off script).
6. Point a staging domain if you want, e.g. `book-staging.fhsalon.ca`.

Keep Netlify site on `main` publishing the static marketing pages only.

## Go-live later (when tested)

1. Add “Book online” on the marketing site linking to the booking app URL (or reverse-proxy `/book`).
2. Promote `feature/online-booking` after QA — either:
   - Merge into `main` and switch hosting to Vercel for the whole site, **or**
   - Keep marketing on Netlify `main` and booking on Vercel permanently (simplest split).
3. Switch `DATABASE_URL` to production Postgres and rotate secrets.

## Selling to other salons

1. Create a new `Salon` (+ admin user, stylists, services) with a new `slug`.
2. Give them `/book/{slug}`, `/display/{slug}`, and admin login.
3. Same codebase — no per-salon fork required.
