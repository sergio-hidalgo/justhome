# Spec 01 — Monorepo scaffold

Status: todo
Phase: 0
Depends on: —

## Goal

A runnable empty monorepo with the agreed stack, so every later spec only adds code.

## Scope

In: workspace layout, tooling, scripts, CI, env handling, local Supabase.
Out: any business logic, DB tables, UI beyond a placeholder page.

## Requirements

R-01.1 Layout:

```
apps/web          Astro SSR (@astrojs/node), Preact integration
apps/api          Fastify + TypeScript, GET /health
packages/engine   empty index.ts exporting ENGINE_VERSION = "0.1.0"
packages/schemas  empty index.ts (zod dependency)
supabase/         supabase init (config.toml, migrations/, seed.sql)
fixtures/         (already present, copied from spec pack)
specs/, issues/   (already present)
```

R-01.2 pnpm workspaces + Turborepo with pipelines `build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`.
R-01.3 Shared `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
R-01.4 ESLint + Prettier shared config; Vitest workspace config; Playwright in `apps/web`.
R-01.5 `.env.example` per app listing: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (api only), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PACK5`, `STRIPE_PRICE_SELLER5`, `STRIPE_PRICE_SELLER_PLUS`, `PUBLIC_API_URL`, `FLAG_JOINT_MODE`, `FLAG_EXPORT`.
R-01.6 Env is validated at startup with a zod schema; the process exits with a readable error if a variable is missing.
R-01.7 GitHub Actions: install → lint → typecheck → unit tests on every PR.
R-01.8 `pnpm dev` starts web (4321), api (3001) and `supabase start`.

## Acceptance criteria

- AC-01.1 `pnpm i && pnpm build` succeeds on a clean clone.
- AC-01.2 `GET http://localhost:3001/health` → `200 {"status":"ok","engineVersion":"0.1.0"}`.
- AC-01.3 `http://localhost:4321/` renders a placeholder page.
- AC-01.4 Starting the API without `SUPABASE_URL` exits non-zero and names the variable.
- AC-01.5 CI workflow runs and passes on the scaffold PR.

## Files

Root configs, `apps/*`, `packages/*`, `supabase/`, `.github/workflows/ci.yml`.
