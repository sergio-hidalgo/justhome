# Spec 09 — Supabase schema, RLS and triggers

Status: todo
Phase: 1
Depends on: 02

## Goal

Create the database that serves both roles, with row-level security and tier limits enforced in Postgres as a second line of defence.

## Requirements

R-09.1 Migration `supabase/migrations/0001_core.sql` (draft below; agent may refine types but not semantics).

```sql
create type role_t as enum ('buyer','seller');
create type prop_status_t as enum ('active','archived','read_only');
create type seller_plan_t as enum ('none','seller5','seller_plus');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  locale text not null default 'es' check (locale in ('es','en')),
  consent_joint_notifications boolean not null default false,
  created_at timestamptz not null default now()
);

create table entitlements (
  user_id uuid primary key references auth.users on delete cascade,
  seller_plan seller_plan_t not null default 'none',
  subscription_status text,                 -- stripe status
  current_period_end timestamptz,
  seller_free_analysis_used boolean not null default false,
  updated_at timestamptz not null default now()
);

create table buyer_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slots_total int not null default 5,
  purchased_at timestamptz not null default now(),
  expires_at timestamptz not null,           -- purchased_at + 6 months
  stripe_payment_intent text unique not null
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  kind text not null check (kind in ('pack5','seller5','seller_plus')),
  stripe_object_id text unique not null,
  amount_cents int not null,
  currency text not null default 'eur',
  status text not null,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  role role_t not null,
  pack_id uuid references buyer_packs,       -- buyer paid properties
  ccaa text not null, province text, municipality text not null,
  asking_price_cents bigint not null,
  listing_date date, days_on_market int,
  is_resale boolean not null default true,
  size_m2 numeric,
  catastral_ref_hash text, address_hash text, listing_url text,
  fingerprint_hash text generated always as (coalesce(catastral_ref_hash, address_hash)) stored,
  status prop_status_t not null default 'active',
  created_at timestamptz not null default now()
);
create index on properties (fingerprint_hash);

create table price_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  event_date date not null, price_cents bigint not null
);

create table positions (
  property_id uuid primary key references properties on delete cascade,
  issues jsonb not null, shapes jsonb not null, weights jsonb not null,
  constraints jsonb not null default '[]', batna jsonb not null,
  situation jsonb not null default '{}',     -- lease end, scenario self-declared, tax hints
  updated_at timestamptz not null default now()
);

create table counterparts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  label text not null,                       -- never a real name
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  counterpart_id uuid not null references counterparts on delete cascade,
  direction text not null check (direction in ('sent','received')),
  package jsonb not null, created_at timestamptz not null default now()
);

create table signals (
  id uuid primary key default gen_random_uuid(),
  counterpart_id uuid not null references counterparts on delete cascade,
  code text not null references signal_catalog(code),
  value text, credibility numeric check (credibility between 0 and 1),
  created_at timestamptz not null default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  engine_version text not null, inputs_hash text not null,
  tier text not null, outputs jsonb not null,
  created_at timestamptz not null default now()
);

create table signal_catalog (
  code text primary key, role role_t not null, applies_to text not null,
  label_key text not null, likelihood jsonb not null,
  batna_shift jsonb, weight_nudge jsonb, margin_delta numeric,
  question_keys text[] not null default '{}', tier text not null default 'paid'
);

create table market_reference (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('national','ccaa','province','city')),
  ccaa text, province text, city text,
  negotiation_margin numeric, itp_rate numeric,
  holding_cost_ranges jsonb,  -- {"A":[80,225],"B":[800,1500],"C":[400,800]}
  dom_adjustments jsonb, horizon_months numeric, rent_per_m2 numeric,
  source_url text not null, as_of date not null,
  created_at timestamptz not null default now()
);

create table joint_sessions ( -- spec 19
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null,
  buyer_property_id uuid references properties, seller_property_id uuid references properties,
  origin text not null check (origin in ('invite','match_notification')),
  status text not null default 'pending',
  recompute_count int not null default 0, locked_inputs_hash text,
  created_at timestamptz not null default now()
);
```

(`signal_catalog` must be created before `signals`; order in the real migration accordingly.)

R-09.2 RLS enabled on every table. Policies:
- `profiles`, `entitlements`, `buyer_packs`, `purchases`: `select` where `user_id/id = auth.uid()`; no client `insert/update` on `entitlements`, `buyer_packs`, `purchases` (service role only).
- `properties`: all ops where `owner_id = auth.uid()`; `update` denied when status = `read_only`.
- Child tables (`positions`, `counterparts`, `offers`, `signals`, `analyses`, `price_events`): access through `exists (select 1 from properties p where p.id = … and p.owner_id = auth.uid())`.
- `signal_catalog`, `market_reference`: public `select`; writes service role only.
- `joint_sessions`: no client access (API with service role).

R-09.3 Trigger `properties_before_insert` raises `slot_limit` / `plan_required` when:
- buyer & anonymous (`auth.jwt()->>'is_anonymous' = 'true'`): already owns ≥ 1 buyer property;
- buyer & authenticated: non-expired packs' slots_total − properties linked to them ≤ 0 (archived count — D-03); sets `pack_id` to the oldest non-expired pack with free slots;
- seller: active seller properties ≥ plan limit (`none` → 1 allowed only while `seller_free_analysis_used = false`; `seller5` → 5; `seller_plus` → `SELLER_PLUS_MAX` setting, null = unlimited).

R-09.4 Trigger `signals_before_insert`: anonymous owner → max 3 signals per property; signal tier `paid` rejected.

R-09.5 Scheduled function (pg_cron daily): set buyer properties to `read_only` when their pack expired (D-04); set seller properties to `read_only` when `subscription_status` not in (`active`,`trialing`) and `current_period_end < now()` (D-07).

R-09.6 `seed.sql`: signal catalogue (spec 05 table). Market rows are loaded from `data/market/2026-10-12.csv` by the spec 14 importer (`pnpm db:reset` runs it after seeding). `market_reference` gains `confidence text` and `note text` columns.

## Acceptance criteria

- AC-09.1 `pnpm db:reset` applies migrations and seed cleanly.
- AC-09.2 RLS test: user A cannot select user B's properties or child rows.
- AC-09.3 Anonymous user second buyer property insert fails with `slot_limit`.
- AC-09.4 Paid user with one pack: 6th property fails; archived properties still count.
- AC-09.5 Seller with plan `none`: first property OK; second fails with `plan_required`.
- AC-09.6 Client insert into `entitlements` fails.
- AC-09.7 Cron function marks expired-pack properties `read_only`; a later update to them fails.

## Files

`supabase/migrations/0001_core.sql`, `0002_rls.sql`, `0003_triggers.sql`, `0004_cron.sql`, `supabase/seed.sql`, `supabase/tests/*.sql` (pgTAP).
