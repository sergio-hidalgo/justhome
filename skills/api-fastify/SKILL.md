---
name: api-fastify
description: Callable skill — conventions for apps/api (Fastify): route/service split, zod validation, problem+json errors, auth plugin and per-request Supabase client, entitlements, analyse pipeline, rate limits, logging and Stripe webhooks. Invoke before writing or changing anything under apps/api (specs 10–14, 18, 19).
---

# API (Fastify)

D-08: the API is a separate Fastify service. The web app never reads domain
data from Supabase directly; it calls this API.

## Layout

- `src/routes/*` — HTTP only: parse → call a service → map result. No business
  logic, no SQL, no engine calls.
- `src/services/*` — logic: `analyse.ts`, `entitlements.ts`, `market.ts`,
  `stripe.ts`, `joint/**`.
- `src/plugins/auth.ts` — JWT verification, `req.user = { id, isAnonymous }`.
- `src/errors.ts` — the only place problem types are defined.
- Config: env parsed once by a zod schema at startup, process exits naming the
  missing variable (R-01.6, AC-01.4). No `process.env` elsewhere.

## Validation and contracts

- Every body, query and param is validated with a schema from
  `packages/schemas`; responses are typed from the same package. Do not define
  a request/response shape in the API.
- Money crosses the API as **integer cents** (`priceCents`); engine euros are
  produced only by `toEngine()` and mapped back by `fromEngine()`.
- Every response containing engine output includes `engineVersion`.
- OpenAPI generated with `@fastify/swagger`, served at `/docs` (AC-11.5).

## Errors (RFC 7807 `application/problem+json`)

| type | status | when | status fixed by spec? |
|---|---|---|---|
| (no token) | 401 | missing/invalid JWT | yes (AC-10.3) |
| `account_required` | 403 | anonymous user on seller endpoint | yes (AC-10.3) |
| `plan_required` | 402 | seller needs a plan (payload lists plans) | yes (R-12.3, AC-12.2) |
| `tier_limit` | 402 | paid-only capability on free tier (e.g. export) | yes (AC-18.1) |
| `read_only` | 409 | write on a read-only property | yes (AC-11.4) |
| `slot_limit` | 402 suggested | no free slot | **no** — spec names the code only |
| `validation` | 400 suggested | schema failure | **no** |
| `not_found` | 404 suggested | missing **or not owned** | **no** |
| `recompute_limit` | 409 suggested | 4th joint recompute (spec 19) | **no** |

Where a status is not fixed by a spec, use the suggested one, define it once in
`errors.ts`, and keep the `type` code identical to the spec — clients branch on
the code, not the status. Map Postgres trigger errors (`slot_limit`,
`plan_required`) to the same types. Never include stack traces, SQL or the
request payload in a problem body.

## Auth and database access

- Verify the Supabase JWT on every non-public route.
- Per-request Supabase client built with the **user's JWT** so RLS applies
  (R-10.5). A second, service-role factory exists and is imported only by:
  the Stripe webhook, `merge-anonymous`, the joint modules and the nightly
  jobs. Never pass a service-role client into a user-facing route handler.
- First authenticated request upserts `profiles` and `entitlements` (R-10.6).

## Entitlements

- `services/entitlements.ts` is the **single** decision point (R-12.1/12.2);
  routes ask it, they don't re-derive rules. DB triggers mirror it.
- Tier passed to the engine: `free` for anonymous and expired-pack-only buyers,
  `paid` otherwise (R-12.4).
- The seller's first free analysis flips `seller_free_analysis_used` in the
  **same transaction** as the successful analysis; later calls → 402
  `plan_required` (R-12.3).
- Prices for display come from Stripe (cached 1 h) / env price ids — never
  literals.

## Analyse pipeline (R-11.2)

load property + position + counterpart(s) + resolved market → build
`EngineInput` → `analyse()` → persist `analyses` row (`engine_version`,
`inputs_hash`, `tier`, outputs **without `draws`**) → return. If a row with the
same `inputs_hash` + `engine_version` exists, return it. Seller with several
counterparts: one run per counterpart, plus the ranking (R-11.3).

## Rate limits and logging

- 60 req/min per user; `/analyze` 10/min (R-11.5).
- pino with request id. At info level log ids, route, status, durations,
  `engineVersion` — never package values, position contents, labels, email or
  listing URLs (R-11.6). Configure redaction for request/response bodies.

## Stripe

- Webhook route uses the **raw body**, verifies the signature first, is
  idempotent by `event.id`, and is the only writer of entitlements/packs/
  purchases (R-13.5).
- Checkout sessions set `client_reference_id = user.id`; Pack 5 requires the
  withdrawal-waiver consent, stored on the purchase.
- Downgrade rules (R-13.6) and refunds (expire that pack) live in the
  `services/stripe.ts` handlers, not in routes.

## Feature flags

`FLAG_JOINT_MODE` and `FLAG_EXPORT` are read from validated config; when off,
the routes are not registered (404).

## Joint mode

Build the per-viewer projection in one function under `services/joint/`; it is
the only path from session data to a response. A test asserts none of the other
side's BATNA, weights, constraints, signals or surplus reach the payload
(AC-19.4).

## Tests

Contract test per endpoint: happy path + main error (AC-11.1). Table-driven
entitlements tests (AC-12.1). Use `testing`; run `security-check` §3–§6 before
declaring done.
