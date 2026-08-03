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

## Step 3 — Create tables + seed data

On your PC (with Neon URL in `platform/.env` as `DATABASE_URL`):

```powershell
cd C:\Users\hkathira\a3-it-solutions\platform
# Put Neon DATABASE_URL + AUTH_SECRET into .env
pnpm install
pnpm db:push
pnpm db:seed
```

That creates schema + Farzana salon + demo logins on the **cloud** DB.

**Then change passwords in Admin** (do not leave `demo1234` in production).

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

## Step 6 — Salon smoke test (before telling clients)

1. Website → Book online → confirm reservation  
2. Tablet: https://book.fhsalon.ca/display/fhsalon  
3. Stylist phone: https://book.fhsalon.ca/stylist (Add to Home Screen)  
4. Admin: https://book.fhsalon.ca/admin  
5. Change all demo passwords  
6. Optional: bookmark / pin floor display on the salon tablet  

---

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
