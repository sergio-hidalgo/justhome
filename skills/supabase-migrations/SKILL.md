---
name: supabase-migrations
description: Callable skill — conventions for Supabase migrations, RLS, triggers, cron, seed and pgTAP in vivienda-negocia. Invoke before writing or editing anything under supabase/ (specs 09, 10, 12, 13, 14, 19), and when an API change needs a new column, policy or trigger.
---

# Supabase migrations

Tier and ownership rules are enforced in Postgres as a **second line of
defence** (spec 09). The API enforces them first and nicely; the database
enforces them regardless.

## Files and order

- `supabase/migrations/NNNN_<slug>.sql`, sequential, named as the specs name
  them: `0001_core`, `0002_rls`, `0003_triggers`, `0004_cron`,
  `0005_purchases_consent` (spec 13), `0006_joint` (spec 19).
- A migration already merged by an earlier spec is **never edited**; changes go
  in a new migration. The spec that owns a file may author it in full.
- Dependency order inside a migration: enums → referenced tables
  (`signal_catalog` before `signals`) → referencing tables → indexes →
  policies → functions/triggers. `pnpm db:reset` must apply cleanly (AC-09.1).
- `seed.sql` holds the signal catalogue only. Market rows are loaded by the
  spec 14 importer from `data/market/*.csv`, which `pnpm db:reset` runs after
  seeding.

## Tables and types

- `snake_case`; ids `uuid default gen_random_uuid()`; timestamps `timestamptz`;
  money `bigint` cents (`*_cents`); rates/margins `numeric`; enums for closed
  sets (`role_t`, `prop_status_t`, `seller_plan_t`).
- FKs to `auth.users` use `on delete cascade` for user-owned data (privacy:
  deleting a user removes their data). Add an index on every FK and on
  `properties(fingerprint_hash)`.
- No PII columns. Counterparts have a `label` only; catastral reference and
  address are stored as `*_hash` (hashed client-side) — never raw.
- Stripe state lives in `entitlements`, `buyer_packs`, `purchases`; the
  `stripe_*` unique columns are the idempotency anchor for webhook replay
  (AC-13.2).

## RLS — same migration, no exceptions

1. `alter table … enable row level security;` immediately after `create table`.
2. `revoke all … from anon, authenticated;` then `grant` only the verbs a role
   needs.
3. Policies from spec 09 R-09.2:
   - own-row tables (`profiles`, `entitlements`, `buyer_packs`, `purchases`):
     `select` where `id/user_id = auth.uid()`; **no** client writes on
     `entitlements`, `buyer_packs`, `purchases`;
   - `properties`: all verbs where `owner_id = auth.uid()`; `update` denied when
     `status = 'read_only'`;
   - children (`positions`, `counterparts`, `offers`, `signals`, `analyses`,
     `price_events`): `exists (select 1 from properties p where p.id = … and
     p.owner_id = auth.uid())` — through the parent, two hops for
     `offers`/`signals` via `counterparts`;
   - `signal_catalog`, `market_reference`: public `select`, service-role writes;
   - `joint_sessions`: RLS on, **no policy at all** (API service role only).
4. A table with RLS and no policy denies everyone — that is the intended way to
   make something service-role-only.

## Triggers and functions

- `properties_before_insert` raises `slot_limit` / `plan_required` (R-09.3);
  `signals_before_insert` caps anonymous owners at 3 and rejects `paid`-tier
  codes (R-09.4). Use `raise exception … using errcode`/`hint` with the exact
  code strings so the API can map them to problem types.
- Read anonymity from `auth.jwt()->>'is_anonymous'`.
- `security definer` functions: `set search_path = public, pg_temp`; fully
  qualify objects; validate inputs; one purpose each. Plain `security invoker`
  is the default.
- The pg_cron job (R-09.5) is idempotent and `security definer`; it only flips
  `status` to `read_only`, never deletes.
- Mirror, don't duplicate, the entitlements rules of spec 12: if you change one
  side, change the other in the same spec and test both.

## Tests (pgTAP, `supabase/tests/*.sql`)

Name tests with the criterion ID. Required coverage:

- AC-09.2 user A cannot select user B's property or any child row;
- AC-09.3 second anonymous buyer property → `slot_limit`;
- AC-09.4 6th property with one pack fails; archived ones still count;
- AC-09.5 seller plan `none`: first OK, second `plan_required`;
- AC-09.6 client insert into `entitlements` fails;
- AC-09.7 cron marks expired-pack properties `read_only`; later update fails.

## Before you commit

- [ ] `pnpm db:reset` is clean; pgTAP green.
- [ ] Every new table has RLS + grants in the same file.
- [ ] No raw identifiers or personal data in seeds or fixtures.
- [ ] Run `security-check` §2 and list advisor / lint findings.
