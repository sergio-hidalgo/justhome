---
name: security-check
description: Callable skill — the security & privacy checklist to run against a diff BEFORE declaring done any task that touches apps/api, Supabase (migrations, RLS, triggers, cron, auth), Stripe billing/webhooks, joint mode, exports/PDF, the anonymous free tier (CAPTCHA, per-IP caps), crawl files or metrics endpoints, env variables or dependencies. Also invoke when the user asks for a security review or audit. Treat every item as blocking.
---

# Security Check

Run every applicable item against YOUR DIFF (not the whole repo, unless asked
for an audit). Report the result in your task summary as pass / fail / n-a per
section. Pair with `constitution-check` (product rules) — this skill is about
keys, data boundaries and abuse.

## 1. Keys and secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` and
      `STRIPE_WEBHOOK_SECRET` are read only in `apps/api` (and the
      `market:import` script for the service-role key). Never `PUBLIC_`-prefixed,
      never imported into `apps/web` or `packages/*`, never in a fixture, log or
      error message.
- [ ] Anything prefixed `PUBLIC_` (inlined into the browser bundle) is genuinely
      safe to publish: `PUBLIC_API_URL`, the Supabase URL and anon key. Nothing
      else.
- [ ] `.gitignore` covers `.env`, `.env.*` (except `.env.example`);
      `.env.example` files hold placeholders only and list exactly the
      variables spec 01 R-01.5 names plus those added by later specs (`PUBLIC_SITE_URL`, `SITE_NAME`, `PUBLIC_TURNSTILE_SITE_KEY`, `DATA_LICENSE_URL`, `*_SITE_VERIFICATION`).
- [ ] Env is validated with zod at startup; no `process.env.X` read outside the
      validated config module.

## 2. Database boundary (Supabase)

- [ ] Every new table has RLS enabled **in the same migration**, explicit
      `revoke`/`grant`, and a policy only where a role must read. Tables that are
      service-role-only (`joint_sessions`, writes to `entitlements`,
      `buyer_packs`, `purchases`, `signal_catalog`, `market_reference`) have no
      client write policy.
- [ ] Child tables are guarded through ownership of `properties.owner_id`
      (`exists (...)`), never by a client-supplied id alone.
- [ ] `security definer` functions and triggers set `search_path = public`
      (plus `pg_temp` last), validate arguments and do one thing; cron functions
      are idempotent.
- [ ] Tier and slot limits are enforced in Postgres triggers as well as the API
      (R-09.3); the anonymous check reads `auth.jwt()->>'is_anonymous'`, never a
      column the client can write.
- [ ] No PII in domain tables: counterparts are `label` only; `catastral_ref`
      and address are stored hashed (`*_hash`), hashed client-side.
- [ ] Supabase advisors / `supabase db lint` run after any migration; findings
      fixed or listed as blockers. (The Supabase MCP may be unauthorized — use
      the CLI and pgTAP instead and say so in the summary.)
- [ ] pgTAP covers: cross-user isolation, client insert into `entitlements`
      fails, `read_only` update fails (AC-09.2, 09.6, 09.7).

## 3. Auth and authorization

- [ ] The API verifies the Supabase JWT on every non-public route; `req.user`
      (`id`, `isAnonymous`) comes only from the verified token.
- [ ] Every DB call from a route uses the per-request client built with the
      user's JWT so RLS applies. The service-role client is imported only in the
      webhook, `merge-anonymous`, joint-orchestration and importer modules;
      grep the diff for the factory's import path.
- [ ] Anonymous tokens on seller endpoints → 403 `account_required`; missing
      token → 401 (AC-10.3). Tests prove both.
- [ ] `POST /api/account/merge-anonymous` re-owns only the caller's own
      anonymous property, only to the caller's authenticated account, and only
      when a slot is free.
- [ ] Ownership is checked on every `:id` route (`properties`, `counterparts`,
      `signals`, `offers`) — 404 (not 403) for other users' ids.
- [ ] Session cookies keep `HttpOnly`, `Secure` (prod), `SameSite=Lax`; tokens
      are never copied into `localStorage`.
- [ ] Sign-in flows do not reveal whether an email exists beyond what Supabase
      itself returns (the "existing email → merge" flow in spec 10 is the only
      exception and requires the user to authenticate first).

## 4. Billing (Stripe)

- [ ] The webhook uses the **raw** body, verifies the signature before any
      work, and is idempotent by `event.id`; invalid signature → 400 with no DB
      change (AC-13.3, 13.2).
- [ ] Entitlements, packs and purchases are written only from verified webhook
      handlers (and the service-role cron), never from a redirect/`success` URL
      or a client call.
- [ ] Prices come from `STRIPE_PRICE_*` env ids; no amount, plan name or
      expiry is trusted from the client. `client_reference_id = user.id` is set
      server-side.
- [ ] Pack 5 checkout cannot complete without the withdrawal-waiver consent, and
      the consent timestamp is stored on the purchase (AC-13.5).
- [ ] We never collect or log card data.

## 5. Input, output and abuse

- [ ] Every body, query and param is validated with the `packages/schemas`
      zod schema at the API boundary; unknown keys are rejected or stripped.
- [ ] Errors are RFC 7807 `problem+json` with a `type` code — no stack traces,
      SQL, or echoed payloads.
- [ ] Rate limits in place: 60 req/min per user, `/analyze` 10/min (R-11.5);
      public catalogue/market endpoints are cached or limited.
- [ ] CORS allows only the web origin; no `*` in production — except
      none: there is no public third-party API.
- [ ] Nothing user-supplied is rendered as raw HTML: no `set:html` /
      `dangerouslySetInnerHTML` of counterpart labels or listing URLs; listing
      URLs are validated as `http(s)` and rendered as text/`rel="noopener"`.
- [ ] Counterpart `label` is ≤ 30 chars and the UI warns not to enter real
      names or contact details; there is no other counterpart free-text field.

## 6. Joint mode and exports

- [ ] Joint endpoints return a per-viewer projection built in one place; a
      test asserts no field derived from the other side's position (BATNA,
      weights, constraints, signals, surplus, pie share) reaches the client other
      than the proposed packages (AC-19.4).
- [ ] The match job notifies only pairs where **both** owners have
      `consent_joint_notifications = true`; notices contain no identity and no
      figures (AC-19.1).
- [ ] Invite tokens are single-use, unguessable and expire in 14 days;
      leaving a session deletes that side's snapshot inputs (R-19.6).
- [ ] Session events are logged without input values.
- [ ] Export (PDF/CSV) contains only the requested property: no other
      properties, no user email, no counterpart free text (R-18.4). PDF
      templates escape all interpolated text and the headless render makes no
      external network requests.
- [ ] `FLAG_JOINT_MODE` / `FLAG_EXPORT` off ⇒ routes return 404, not a partial
      feature.

## 7. Privacy and logging

- [ ] No log line contains package values, position contents, labels, email or
      listing URLs at info level; ids, kinds, counts and `engineVersion` only
      (R-11.6). pino redaction paths cover `req.body` and `res.body`.
- [ ] Anonymous data is retained only as long as spec 10 R-10.7 says (30 days
      inactive → deleted).
- [ ] Test data uses synthetic people and addresses; fixtures contain no real
      catastral references.

## 8. Automation and machine access (D-17, D-18)

- [ ] No route, tool or document lets an anonymous caller run the engine
      outside the app flow; `/docs` is 404 in production (AC-11.5).
- [ ] Anonymous sign-in requires a valid CAPTCHA token; the Turnstile secret
      lives only in the Supabase project settings, never in the repo.
- [ ] Per-IP caps hold: 5 anonymous sign-ins/hour, 20 anonymous
      analyses/day, public `GET`s and `/api/metrics/channel` rate-limited.
- [ ] Deep-link parameters prefill property facts only; anything else is
      ignored, never trusted, never auto-submitted.
- [ ] `robots.txt`, sitemap and `llms.txt` never list private routes, `/api/`
      or `/docs`; training crawlers are disallowed (only `Google-Extended` is allowed, on
      public knowledge routes).
- [ ] Metrics tables hold aggregates only: no IP, user id, cookie or input
      value.

## 9. Dependencies

- [ ] Each new dependency: named in the summary, justified in one line,
      actively maintained, no `postinstall` doing network/filesystem surprises.
      Added with `pnpm --filter <pkg> add`, never a second lockfile.
- [ ] `packages/engine` gains no runtime dependency except the seeded PRNG
      (Constitution §3).

If any item fails and can't be fixed within the task, STOP and report it as a
blocker (and an `issues/` file) — do not ship with a failing item "to be fixed
later".
