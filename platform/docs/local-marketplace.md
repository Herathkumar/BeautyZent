# Local BeautyZent marketplace database

Keeps the **multi-salon** Postgres (`127.0.0.1:55433` / `salonbook`) untouched.

| | Multi-salon | Marketplace |
|---|---|---|
| Compose | `docker-compose.yml` | `docker-compose.marketplace.yml` |
| Port / DB | `55433` / `salonbook` | `55434` / `beautyzent` |
| Env file | `.env.local` | `.env.marketplace` |
| Scripts | `pnpm db:local:*` · `pnpm dev:local` | `pnpm db:marketplace:*` · `pnpm dev:marketplace` |

## Setup (marketplace branch)

```bash
cd platform
Copy-Item .env.marketplace.example .env.marketplace   # if missing

# Postgres — pick one:
pnpm db:marketplace:docker     # Docker Desktop
# OR (no Docker — leave this terminal open):
pnpm db:marketplace:up

pnpm db:marketplace:setup
pnpm dev:marketplace
```

- Explore: http://localhost:3000/explore  
- Claim: http://localhost:3000/claim  
- Platform: http://localhost:3000/platform — `platform@beautyzent.local` / `demo1234`

## Multi-salon again

```bash
pnpm db:local:docker
pnpm dev:local
```

Do **not** run `pnpm db:local:push` from marketplace work if you want salonbook schema frozen — marketplace schema changes go through `db:marketplace:*` only.
