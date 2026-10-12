# Spec 11 — Fastify API core

Status: todo
Phase: 1
Depends on: 02, 07, 09, 10

## Goal

All reads and writes for properties, positions, counterparts, offers and signals, plus the analyse endpoint that runs the engine server-side and stores a snapshot.

## Requirements

R-11.1 Endpoints (JSON, money in cents, validated with `packages/schemas`; OpenAPI generated via `@fastify/swagger` at `/docs`):

| method | path | body / query | result | gate |
|---|---|---|---|---|
| GET | /api/properties | `?role=buyer\|seller&status=` | list with latest analysis summary | owner |
| POST | /api/properties | property step + position step | property | spec 12 limits |
| GET | /api/properties/:id | — | property + position + counterparts + latest analysis | owner |
| PATCH | /api/properties/:id | partial property / position | property | owner, not read_only |
| POST | /api/properties/:id/archive | — | property | owner |
| POST | /api/properties/:id/price-events | `{date, priceCents}` | event | owner |
| POST | /api/properties/:id/counterparts | `{label, answers}` | counterpart | buyer: max 1; seller: subscribed or free analysis |
| PATCH | /api/counterparts/:id | `{answers}` | counterpart | owner |
| POST | /api/counterparts/:id/signals | `{code, value?, credibility?}` | signal + new analysis | owner; free tier ≤ 3 |
| POST | /api/counterparts/:id/offers | `{direction, package}` | offer + new analysis | owner |
| POST | /api/properties/:id/analyze | `{counterpartId?}` | `EngineOutput` (+ analysisId) | owner; spec 12 |
| GET | /api/properties/:id/analyses | — | snapshots list | paid |
| GET | /api/catalog/signals | `?role=` | signal catalogue (i18n keys) | public |
| GET | /api/market/:ccaa/:city? | — | resolved market reference | public |

R-11.2 Analyse pipeline: load property + position + counterpart(s) + resolved market reference → build `EngineInput` (tier from spec 12) → `analyse()` → persist `analyses` row (`engine_version`, `inputs_hash`, `tier`, outputs without `draws`) → return. If an analysis with the same `inputs_hash` and `engine_version` exists, return it (cache).

R-11.3 Seller with several counterparts: analyse runs once per counterpart and returns `{ perCounterpart: [...], ranking: [{counterpartId, uMeOfLatestOffer, surplusEur, acceptProbOfCounter}] }` sorted by uMe.

R-11.4 Errors: RFC 7807 problem+json with `type` codes: `slot_limit`, `plan_required`, `account_required`, `tier_limit`, `read_only`, `validation`, `not_found`.

R-11.5 Rate limit: 60 req/min per user; `/analyze` 10/min.

R-11.6 Logging: pino, request id; never log package values or position contents at info level.

## Acceptance criteria

- AC-11.1 Contract tests for every endpoint (happy path + main error).
- AC-11.2 Two identical analyse calls → second returns cached `analysisId`.
- AC-11.3 Logging a signal returns an analysis whose `inputsHash` differs from the previous one.
- AC-11.4 PATCH on a `read_only` property → 409 `read_only`.
- AC-11.5 `/docs` serves the OpenAPI document.

## Files

`apps/api/src/routes/{properties,counterparts,catalog,market}.ts`, `apps/api/src/services/analyse.ts`, `apps/api/src/errors.ts`, tests.
