# vivienda-negocia — spec pack

Spec-driven development pack for a web app that applies game theory (BATNA, ZOPA, Pareto, Nash, Kalai-Smorodinsky) to resale home negotiations in Spain, for buyers and sellers, with a public knowledge layer (guides, market intelligence, methodology) that AI assistants can read and cite, pointing users to the app for the personalised analysis.

Source of truth for product decisions: the "Game-Theory Housing Negotiation App — Product & Technical Spec" doc (rev 569, 2026-10-12). This pack turns it into small, ordered, implementable specs.

## How to use

1. Read `CONSTITUTION.md` once. It is binding for every spec.
2. Implement specs **in phase order** (`CONSTITUTION.md §8`: 0 → 1 → 2 → 3), numeric within a phase. Each spec = one branch = **one commit** (or one PR) that makes its acceptance criteria pass.
3. An agent (Claude Code / Antigravity) gets: `AGENTS.md` + `CONSTITUTION.md` + the one spec it is working on + any spec it lists under _Depends on_ (plus any `specs/*-amendment.md` naming them, which exists only for specs already done).
4. Bugs or gaps found while building go in `issues/` using `issues/_TEMPLATE.md`, never as silent changes to a finished spec.
5. A spec not yet implemented (`Status: todo`) is edited in place, with an issue recording the decision. A finished spec (`Status: done`) is changed only through `NN-...-amendment.md`.

## Running locally

Requirements: Node ≥ 22.18 and pnpm 11. Docker is only needed for the local Supabase stack.

First-time setup:

```bash
pnpm i
cp apps/api/.env.example apps/api/.env   # placeholders; the API exits if a variable is missing
cp apps/web/.env.example apps/web/.env
```

Start everything:

```bash
pnpm dev:apps   # web (Astro) on :4321 + api (Fastify) on :3001, no Docker needed
pnpm dev        # same, plus `supabase start` first (needs Docker)
```

Start one side only (hot reload):

```bash
pnpm --filter @vivienda/web dev   # client → http://localhost:4321
pnpm --filter @vivienda/api dev   # server → http://localhost:3001/health
```

Production-style run (build first; each side reads its own `.env`):

```bash
pnpm build
pnpm --filter @vivienda/api start   # node dist/index.js
pnpm --filter @vivienda/web start   # node dist/server/entry.mjs (set HOST/PORT to override)
```

Other commands: `pnpm test`, `pnpm test:e2e` (run `pnpm --filter @vivienda/web exec playwright install chromium` once), `pnpm lint`, `pnpm typecheck`, `pnpm db:reset`.

### Local Supabase (Docker)

Requires Docker Desktop running and the Supabase CLI (`brew install supabase/tap/supabase`). Config lives in `supabase/` (`config.toml`, `migrations/`, `seed.sql`); containers are named `supabase_*_justhome`.

First run:

```bash
supabase start            # pulls images (first time only), applies migrations, runs seed.sql
supabase status -o env    # copy ANON_KEY and SERVICE_ROLE_KEY
```

Paste the keys into the `.env` files (local dev keys only — never commit them):

- `apps/web/.env`: `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_ANON_KEY=<ANON_KEY>`
- `apps/api/.env`: same two, plus `SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>`

Local services:

| Service             | URL                                                       |
| ------------------- | --------------------------------------------------------- |
| API (used by apps)  | `http://127.0.0.1:54321`                                  |
| Postgres            | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (admin UI)   | `http://127.0.0.1:54323`                                  |
| Mail catcher (auth) | `http://127.0.0.1:54324`                                  |

Day-to-day:

| Task                                   | Command                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| Start the stack (no-op if already up)  | `supabase start`                                               |
| Show status, URLs and keys             | `supabase status`                                              |
| Wipe DB, re-apply migrations + seed    | `pnpm db:reset`                                                |
| Create a new migration                 | `supabase migration new <name>`                                |
| List applied migrations                | `supabase migration list --local`                              |
| Diff local DB changes into a migration | `supabase db diff -f <name>`                                   |
| Open a psql shell                      | `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Stop this project (keeps data)         | `supabase stop`                                                |
| Stop and delete local data             | `supabase stop --no-backup`                                    |
| Stop every local Supabase project      | `supabase stop --all`                                          |
| Update the CLI                         | `brew upgrade supabase`                                        |

Troubleshooting:

- **"port 5432x already allocated"** — another Supabase project is running. Find it with `docker ps --filter label=com.supabase.cli.project`, then `supabase stop --all`.
- **"Cannot connect to the Docker daemon"** — start Docker Desktop and wait for "Engine running".
- **App fails with `Invalid environment configuration`** — a `.env` file is missing; copy it from `.env.example` (see First-time setup).
- **Schema out of sync after pulling new migrations** — run `pnpm db:reset`.

## Map

| #   | Spec                                                    | Layer              | Phase |
| --- | ------------------------------------------------------- | ------------------ | ----- |
| 01  | Monorepo scaffold                                       | tooling            | 0     |
| 02  | Domain types and shared schemas                         | packages/schemas   | 0     |
| 03  | Engine: value functions and utility                     | packages/engine    | 0     |
| 04  | Engine: own BATNA and time decay                        | packages/engine    | 0     |
| 05  | Engine: counterpart estimation (Bayesian + Monte Carlo) | packages/engine    | 0     |
| 06  | Engine: package space and equilibrium metrics           | packages/engine    | 0     |
| 07  | Engine: strategy layer and traffic lights               | packages/engine    | 0     |
| 08  | Engine: golden fixtures and property tests              | packages/engine    | 0     |
| 09  | Supabase schema, RLS and triggers                       | supabase           | 1     |
| 10  | Auth and anonymous sessions                             | api + web          | 1     |
| 11  | Fastify API core                                        | apps/api           | 1     |
| 12  | Entitlements and tier limits                            | apps/api + db      | 1     |
| 13  | Stripe billing                                          | apps/api           | 1     |
| 14  | Market reference data (manual)                          | db + api           | 1     |
| 15  | Web shell, routing and i18n (ES/EN)                     | apps/web           | 1     |
| 16  | Buyer UI (functional)                                   | apps/web           | 1     |
| 17  | Seller UI (functional)                                  | apps/web           | 2     |
| 18  | Export (PDF/CSV)                                        | api + web          | 2     |
| 19  | Joint orchestration (buyer ↔ seller)                    | engine + api + web | 3     |
| 20  | Public knowledge layer (guides, methodology, GEO files) | apps/web           | 1 / 2 |
| 21  | Market intelligence (city pages, studies, datasets)     | apps/web + data    | 2     |
| 22  | GEO measurement and AI-channel attribution              | web + api + geo/   | 2     |

Phase exit criteria are in `CONSTITUTION.md §8`.

> **Note:** the spec pack (`CONSTITUTION.md`, `AGENTS.md`, `specs/`, `skills/`, `issues/`, `fixtures/`, `data/`, `docs/`) is versioned in this repository on purpose, so the process is reproducible from a clone. Only `refs/` (the original source notes PDF) is kept local and is not published.

## Folder layout

```text
README.md            this file
CONSTITUTION.md      principles, stack, decisions, glossary
AGENTS.md            instructions for coding agents
specs/NN-*.md        one spec per commit
specs/NN-*-amendment.md   amendments to finished specs only (none yet)
skills/<name>/       working checklists for agents (testing, engine-guardrails,
                     constitution-check, security-check, supabase-migrations,
                     api-fastify, web-ui, public-content,
                     code-refactor)
fixtures/            golden test data (engine)
data/market/         sourced market seed CSV (spec 14)
docs/                market sources and refresh cadence (+ GEO runbook, spec 22)
geo/                 AI-visibility benchmark, runs and reports (spec 22)
issues/              bug / gap reports during development
```
