# Spec 11 — Fastify API core

Status: todo
Phase: 1
Depends on: 02, 07, 09, 10

## Goal

All reads and writes for properties, positions, counterparts, offers and signals, plus the analyse endpoint that runs the engine server-side and stores a snapshot.

## Requirements

R-11.1 Endpoints (JSON, money in cents, validated with `packages/schemas`; OpenAPI generated via `@fastify/swagger` from the schema descriptions (R-02.9), served at `/docs` **only outside production**). The API is the web app's backend, not a public product: it is not advertised in `llms.txt` or the sitemap, and all routes except `GET /api/catalog/signals`, `GET /api/market/*` and `GET /health` require a Supabase JWT (spec 10).

| method | path                             | body / query                   | result                                               | gate                                              |
| ------ | -------------------------------- | ------------------------------ | ---------------------------------------------------- | ------------------------------------------------- |
| GET    | /api/properties                  | `?role=buyer\|seller&status=`  | list with latest analysis summary                    | owner                                             |
| POST   | /api/properties                  | property step + position step  | property                                             | spec 12 limits                                    |
| GET    | /api/properties/:id              | —                              | property + position + counterparts + latest analysis | owner                                             |
| PATCH  | /api/properties/:id              | partial property / position    | property                                             | owner, not read_only                              |
| POST   | /api/properties/:id/archive      | —                              | property                                             | owner                                             |
| POST   | /api/properties/:id/price-events | `{date, priceCents}`           | event                                                | owner                                             |
| POST   | /api/properties/:id/counterparts | `{label, answers}`             | counterpart                                          | buyer: max 1; seller: subscribed or free analysis |
| PATCH  | /api/counterparts/:id            | `{answers}`                    | counterpart                                          | owner                                             |
| POST   | /api/counterparts/:id/signals    | `{code, value?, credibility?}` | signal + new analysis                                | owner; free tier ≤ 3                              |
| POST   | /api/counterparts/:id/offers     | `{direction, package}`         | offer + new analysis                                 | owner                                             |
| POST   | /api/properties/:id/analyze      | `{counterpartId?}`             | `EngineOutput` (+ analysisId)                        | owner; spec 12                                    |
| GET    | /api/properties/:id/analyses     | —                              | snapshots list                                       | paid                                              |
| GET    | /api/catalog/signals             | `?role=`                       | signal catalogue (i18n keys)                         | public                                            |
| GET    | /api/market/:ccaa/:city?         | —                              | resolved market reference                            | public                                            |

R-11.2 Analyse pipeline: load property + position + counterpart(s) + resolved market reference + signal catalogue rows (mapped with `catalogFromRows`, R-02.8; may be cached in-process) → build `EngineInput` (tier from spec 12) → `analyse()` → persist `analyses` row (`engine_version`, `inputs_hash`, `tier`, outputs without `draws`) → return. If an analysis with the same `inputs_hash` and `engine_version` exists, return it (cache). Because the catalogue is part of `inputs_hash`, a changed catalogue never returns a stale cached analysis.

R-11.3 Seller with several counterparts: analyse runs once per counterpart and returns `{ perCounterpart: [...], ranking: [{counterpartId, uMeOfLatestOffer, surplusEur, acceptProbOfCounter}] }` sorted by uMe.

R-11.4 Errors: RFC 7807 problem+json with `type` codes: `slot_limit`, `plan_required`, `account_required`, `tier_limit`, `read_only`, `validation`, `not_found`, `rate_limited`.

R-11.5 Rate limit: 60 req/min per user; `/analyze` 10/min. Anonymous users additionally: analyses (direct or triggered by signals/offers) ≤ 20 per IP per day (R-10.8). Public `GET` endpoints: 60 req/min per IP, cached 1 h.

R-11.6 Logging: pino, request id; never log package values or position contents at info level.

## Acceptance criteria

- AC-11.1 Contract tests for every endpoint (happy path + main error).
- AC-11.2 Two identical analyse calls → second returns cached `analysisId`.
- AC-11.3 Logging a signal returns an analysis whose `inputsHash` differs from the previous one.
- AC-11.4 PATCH on a `read_only` property → 409 `read_only`.
- AC-11.5 `/docs` serves the OpenAPI document outside production and returns 404 with `NODE_ENV=production`.
- AC-11.6 After changing a catalogue row, an otherwise identical analyse call does not return the cached `analysisId`.
- AC-11.7 The 21st analysis in a day from anonymous sessions on one IP → 429 `rate_limited`.

## Files

`apps/api/src/routes/{properties,counterparts,catalog,market}.ts`, `apps/api/src/services/analyse.ts`, `apps/api/src/errors.ts`, tests.
