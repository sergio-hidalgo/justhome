# vivienda-negocia — spec pack

Spec-driven development pack for a web app that applies game theory (BATNA, ZOPA, Pareto, Nash, Kalai-Smorodinsky) to resale home negotiations in Spain, for buyers and sellers.

Source of truth for product decisions: the "Game-Theory Housing Negotiation App — Product & Technical Spec" doc (rev 569, 2026-10-12). This pack turns it into small, ordered, implementable specs.

## How to use

1. Read `CONSTITUTION.md` once. It is binding for every spec.
2. Implement specs **in numeric order**. Each spec = one branch = **one commit** (or one PR) that makes its acceptance criteria pass.
3. An agent (Claude Code / Antigravity) gets: `AGENTS.md` + `CONSTITUTION.md` + the one spec it is working on + any spec it lists under _Depends on_, plus every `specs/*-amendment.md` that names those specs in its `Amends:` line.
4. Bugs or gaps found while building go in `issues/` using `issues/_TEMPLATE.md`, never as silent changes to a finished spec.
5. A spec is changed only through a new spec (`NN-...-amendment.md`) or an issue that references it.

## Running locally

Requirements: Node ≥ 22.9 and pnpm 11. Docker is only needed for the local Supabase stack.

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

Phase exit criteria are in `CONSTITUTION.md §8`.

> **Note:** the spec pack (`CONSTITUTION.md`, `AGENTS.md`, `specs/`, `skills/`, `issues/`, `fixtures/`, `data/`, `docs/`) is versioned in this repository on purpose, so the process is reproducible from a clone. Only `refs/` (the original source notes PDF) is kept local and is not published.

## Folder layout

```text
README.md            this file
CONSTITUTION.md      principles, stack, decisions, glossary
AGENTS.md            instructions for coding agents
specs/NN-*.md        one spec per commit
specs/NN-*-amendment.md   binding amendments, applied with the spec they amend
skills/<name>/       working checklists for agents (testing, engine-guardrails,
                     constitution-check, security-check, supabase-migrations,
                     api-fastify, web-ui, code-refactor)
fixtures/            golden test data (engine)
data/market/         sourced market seed CSV (spec 14)
docs/                market sources and refresh cadence
issues/              bug / gap reports during development
```
