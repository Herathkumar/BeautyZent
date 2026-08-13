# Local multi-salon development

Runs the whole platform (client booking, manager, stylist, display, member profile, walk-in) plus
the new **platform operator console** against a throwaway local Postgres with **two demo salons**.

Nothing here touches Neon or Vercel. `platform/.env` keeps its production values; `.env.local`
overrides them locally, and the `db:local:*` scripts refuse to run against a non-local host.

## 1. One-time setup

```bash
cd platform
pnpm install
cp .env.local.example .env.local     # PowerShell: Copy-Item .env.local.example .env.local
```

## 2. Start a local Postgres

Pick either option — both listen on `127.0.0.1:55433` with the same credentials, so
`DATABASE_URL` in `.env.local` works for both.

**Docker (preferred if Docker Desktop is installed)**

```bash
pnpm db:local:docker        # docker compose up -d
pnpm db:local:docker:down   # stop (add -v to wipe the volume)
```

**No Docker — embedded Postgres**

```bash
pnpm db:local:up            # foreground; leave this terminal open, Ctrl+C stops it
pnpm db:local:up -- --reset # wipe .local-pg-data and start fresh
```

## 3. Create the schema and seed both salons

```bash
pnpm db:local:setup         # prisma db push + seed  (or run db:local:push / db:local:seed)
```

## 4. Run the app

```bash
pnpm dev:local              # next dev with the local DATABASE_URL
```

`pnpm dev` also works once `.env.local` exists — `dev:local` just adds the "never hit Neon" guard.

Handy extra: `pnpm db:local:studio` opens Prisma Studio on the local database.

## Seeded logins

| Portal | URL | Login |
| --- | --- | --- |
| Platform console | http://localhost:3000/platform | `platform@salonbook.local` / `demo1234` |
| Manager (either salon) | http://localhost:3000/manager | `manager@fhsalon.ca` / `demo1234` |
| Manager (demo salon) | http://localhost:3000/manager | `manager@demosalon.test` / `demo1234` |
| Stylist app | http://localhost:3000/stylist | `farzana@fhsalon.ca`, `aisha@`, `omar@` / `demo1234` |
| Stylist app (demo salon) | http://localhost:3000/stylist | `priya@demosalon.test`, `marco@` / `demo1234` |

Manager and stylist apps resolve the salon from the signed-in account, so the same URL serves every
tenant. Staff emails must therefore be unique across salons — the platform console enforces this.

## Salon URLs

| Salon | Booking | Tablet display |
| --- | --- | --- |
| Farzana Hair Salon (`fhsalon`) | `/book/fhsalon` | `/display/fhsalon` |
| Demo Hair Studio (`demosalon`) | `/book/demosalon` | `/display/demosalon` |

Member sign-in, my-bookings, walk-in, and the look book all live under the booking app for each slug.

## Platform operator console

`/platform` is a separate surface for you, not for salon staff:

- Own cookie (`fh_platform_session`) and own credentials — salon sessions are untouched.
- List every salon with stylist/service/booking counts and active state.
- Create a salon: name, slug, timezone, hours, slot length, contact info, theme packs, manager
  email/password, and an optional starter stylist + service menu so `/book/<slug>` works instantly.
- Configure a salon: everything above plus default closed days, active/paused, and a manager
  password reset. Pausing a salon makes its public booking catalog return 404.

## Themes

Each salon picks one theme pack per app — booking, manager, and stylist — from nine packs defined in
`src/lib/salon-themes.ts` (`cocoa`, `plum`, `seaglass`, `noir`, `ember`, `laurel`, `indigo`, `blush`,
`saffron`). A pack is a dark palette plus its light companion, so the in-app Appearance toggle still
switches light/dark — it just switches within the salon's pack.

- Palettes are emitted as `--t-*` CSS variables into `src/app/salon-themes.css` by
  `pnpm themes:build` (also wired to `predev` / `prebuild`). Edit the packs in TypeScript, never the
  generated CSS.
- The active pack lands on `<html data-salon-theme="…">`; the light half is selected by the
  `theme-light` class the shells add alongside their existing `*-shell--light/dark` classes.
- Booking resolves the pack server-side from the slug; manager and stylist resolve it from the
  signed-in salon and cache it in `localStorage` (`salon-brand:*`) so cold starts paint correctly.
- Seeded defaults: `fhsalon` keeps the original look (plum / cocoa / seaglass) and `demosalon` uses
  indigo / laurel / ember so per-tenant theming is obvious side by side.
- Deep links to each salon's booking, display, manager, and stylist apps.

Credentials come from `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`. The seed writes them into
the `PlatformAdmin` table, and the same pair also works as an env-only fallback on an unseeded
database. Change them in `.env.local` before using this anywhere shared.

## Notes

- The seed skips the second salon during e2e runs (`E2E_DATABASE_URL` set) so the Playwright
  fixtures stay exactly as before. `SEED_DEMO_SALON=false` skips it manually.
- Schema changes are additive (`Salon.active`, `Salon.brandColor`, `Salon.accentColor`, the three
  `*ThemeId` columns, and the new `PlatformAdmin` model), so `prisma db push` is enough — no
  migration needed.
