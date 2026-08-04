# Go live — www.fhsalon.ca + online booking

**Target architecture (keeps Netlify free for marketing):**

| Piece | Host | URL |
|--------|------|-----|
| Marketing site | Netlify (free) | https://www.fhsalon.ca |
| Booking app | Vercel (Hobby free) | https://book.fhsalon.ca |
| Database | Neon Postgres (free) | connection string only |

Live clients use: **Website → Book online → book.fhsalon.ca**  
Salon staff use: `/display/fhsalon`, `/stylist`, `/admin` on the same booking host.

---

## Step 1 — Neon free database

1. Sign up at [neon.tech](https://neon.tech) (GitHub login is fine).
2. Create project: name `salonbook`, region close to you (e.g. US East).
3. Copy the **connection string** (pooled is fine), looks like:  
   `postgresql://…@….neon.tech/neondb?sslmode=require`
4. Save it — you’ll paste into Vercel and optionally local `.env`.

---

## Step 2 — Deploy booking app on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import **Herathkumar/fhsalon**.
2. Configure:
   - **Root Directory:** `platform` (Important)
   - **Framework:** Next.js (auto)
   - **Production Branch:** `feature/online-booking` (until you merge later)
3. **Environment variables** (Production):

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | Neon connection string |
   | `AUTH_SECRET` | Long random string (32+ chars) |
   | `NEXT_PUBLIC_APP_URL` | `https://book.fhsalon.ca` |
   | `NEXT_PUBLIC_DEFAULT_SALON_SLUG` | `fhsalon` |
   | `NEXT_PUBLIC_MARKETING_URL` | `https://www.fhsalon.ca` |

4. Deploy. Note the temporary URL: `https://something.vercel.app`.

---

## Step 3 — Create tables + production-ready data

On your PC (with Neon URL in `platform/.env` as `DATABASE_URL`):

```powershell
cd C:\Users\hkathira\a3-it-solutions\platform
# Put Neon DATABASE_URL + AUTH_SECRET into .env
pnpm install
pnpm db:push
```

**Demo / local QA only** (creates stylists, services, products + `demo1234`):

```powershell
pnpm db:seed
```

**Production reset** (wipes salon data; leaves salon shell + one admin only):

```powershell
$env:CONFIRM_PRODUCTION_RESET="YES"
# optional: $env:PRODUCTION_ADMIN_PASSWORD="YourStrongPasswordHere"
pnpm db:seed:production
```

Save the printed admin email/password. Then in Admin create real Services, Stylists, and Products.

Use a **separate Neon branch** for Playwright / local demo seed so production stays clean.

---

## Step 4 — Custom domain book.fhsalon.ca

1. In Vercel → Project → **Settings → Domains** → add `book.fhsalon.ca`.
2. At your DNS host (wherever fhsalon.ca is managed), add the CNAME Vercel shows, e.g.:
   - **Name:** `book`
   - **Value:** `cname.vercel-dns.com` (or what Vercel displays)
3. Wait for SSL (usually a few minutes).
4. Confirm:
   - https://book.fhsalon.ca/book/fhsalon
   - https://book.fhsalon.ca/demo
   - https://book.fhsalon.ca/admin/login

Until DNS is ready, you can temporarily set marketing “Book online” to the `*.vercel.app` URL.

---

## Step 5 — Point www.fhsalon.ca “Book online” (Netlify)

Marketing stays on Netlify **`main`**. Booking stays on Vercel.

1. On branch `main` (or via Netlify UI), set the Book online button to:  
   `https://book.fhsalon.ca/book/fhsalon`  
   (already prepared on `feature/online-booking` in `index.html` — merge/copy that change to `main`).
2. Deploy Netlify production as usual.
3. Open https://www.fhsalon.ca → **Book online** → complete a test booking.

Do **not** set Netlify root to `platform` — leave it publishing the static HTML site.

---

## Step 6 — Load real salon data (first admin session)

1. Open https://fhsalon.vercel.app/admin/login (or book.fhsalon.ca when DNS is ready)
2. Sign in with the production admin password from `pnpm db:seed:production`
3. **Services** — add real menu (name, duration, price, category)
4. **Stylists** — add each stylist (gender for avatar); copy the temp login once and send to them
5. On Services, use **Link all services → stylists** if booking step 2 is empty
6. **Products** — optional retail items
7. Ask each stylist to open `/stylist`, change password, and take a selfie under Account
8. Change the admin password after first login (via Account tooling when available, or reset + set a new one)

## Step 7 — Salon smoke test (before telling clients)

1. Website → Book online → confirm a real test reservation  
2. Tablet: https://fhsalon.vercel.app/display/fhsalon (or book.fhsalon.ca)  
3. Stylist phone: `/stylist` → Add to Home Screen  
4. Admin: `/admin` → see the booking  
5. Optional: pin floor display on the salon tablet  
6. Do **not** run `pnpm db:seed` against production (that reloads demo data)  

---

## Local QA automation (Playwright)

From `platform/`:

```powershell
pnpm db:seed          # ensure demo logins exist
pnpm test:e2e         # runs all flows; writes HTML report
pnpm test:e2e:report  # open playwright-report
```

Details: `platform/e2e/README.md`.

## Local development after Postgres switch

`platform` now expects **PostgreSQL** (not SQLite).

```powershell
cd platform
# DATABASE_URL = your Neon string (same DB or a separate “dev” branch in Neon)
pnpm db:push
pnpm dev
```

Marketing site locally:

```powershell
cd C:\Users\hkathira\a3-it-solutions
npx --yes serve -l 5500
```

---

## Logins (change after go-live)

| Role | Email | Default password |
|------|--------|------------------|
| Admin | admin@fhsalon.ca | demo1234 |
| Stylist | farzana@fhsalon.ca | demo1234 |

---

## Optional later

- Google Calendar OAuth for stylists  
- Stronger passwords / invite-only stylist accounts  
- Merge `feature/online-booking` into `main` once stable (keep Netlify publish settings on static files only)
