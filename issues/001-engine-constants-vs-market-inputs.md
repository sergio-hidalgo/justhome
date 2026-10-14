# Issue 001: Which numbers may live inside the engine, and where does the signal catalogue come from?

Status: resolved
Found while implementing: pre-implementation review (specs 04, 05, 09)
Affects specs: 02, 04, 05, 07, 09, 14
Type: product-decision-needed

## What happened

The Constitution (§5) says "Market priors (margins, cost ranges, ITP rates) are **inputs**, never constants in code", and AGENTS.md says "Never hard-code market numbers". Spec 05 nevertheless specifies many numeric tables that an implementer has to put somewhere:

- scenario priors P(A/B/C) per answer combination (R-05.1.3)
- Dirichlet presets per scenario and κ = 20…60 (R-05.1.6)
- triangular `band` = 0.03, buyer `headroom` ~ Triangular(0, 0.03, 0.08) (R-05.1.1, R-05.2)
- signal likelihoods and margin deltas (R-05.3) — seeded in `supabase/seed.sql` (spec 09 R-09.6)
- `ANCHOR_MIN_ACCEPT` = 0.25, light thresholds, timing ratio 1.5 (spec 07)

Separately, `EngineInput` (spec 02 R-02.5) has `me`, `other`, `property`, `market`, `tier`, `options` — there is **no field for the signal catalogue**, yet the pure engine needs the likelihoods. And spec 04 R-04.3's table quotes figures (80–225 €, 800–1,500 €) that differ from the sourced seed CSV (183 €, 417 €).

## Expected

One explicit rule for each of the three kinds of number, so no agent has to guess.

## Reproduce

1. Read spec 05 R-05.1.3 and R-05.1.6, then Constitution §5.
2. Try to decide whether the prior table belongs in `packages/engine` or in `market_reference`.

## Proposed resolution

Classify numbers into three kinds:

| kind             | examples                                                                               | lives in                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market data      | margin, ITP, holding-cost ranges, DOM adjustments, horizon months, rent €/m²           | `market_reference` → `EngineInput.market` (never in engine code)                                                                                                  |
| Model parameters | scenario priors, Dirichlet presets, κ, band, headroom, thresholds, `ANCHOR_MIN_ACCEPT` | one file `packages/engine/src/params.ts`, named constants, each with a spec reference; any change bumps `ENGINE_VERSION`                                          |
| Signal catalogue | likelihoods, batnaShift, weightNudge, margin deltas                                    | DB (`signal_catalog`) is the source of truth → passed in as `EngineInput.catalog`; its hash is part of `inputsHash` so cached analyses invalidate when it changes |

Options:

- **A (recommended, hybrid):** as the table above. Needs a small spec 02 amendment adding `catalog` to `EngineInput`. Matches what specs 05 and 09 already say in prose.
- **B (all bundled):** model parameters _and_ catalogue are constants in the engine; `signal_catalog` in the DB is for display only. Simplest, but the DB catalogue and the engine can drift.
- **C (all injected):** everything numeric comes through `EngineInput`. Purest, but every call site must assemble a large input and spec 05 tables would move into the DB.

Also confirm that spec 04 R-04.3's figures are illustrative and the CSV (`data/market/2026-10-12.csv`) wins — see issue 002.

## Resolution

Decision (product owner, 2026-10-12): **option A (hybrid)**.

- Market data → `EngineInput.market`, never in engine code.
- Model parameters → named constants in `packages/engine/src/params.ts`; any change bumps `ENGINE_VERSION`.
- Signal catalogue → `EngineInput.catalog` (DB is the source of truth); its hash is part of `inputsHash`.
- Spec 04 R-04.3 amounts are illustrative; `data/market/*.csv` wins.

Resolved by `specs/02-domain-types-and-schemas-amendment.md` (also amends specs 04, 05, 09, 11). Spec 03's `presets.ts` stays the home of weight presets and default ordinal tables; `params.ts` holds the rest of the model parameters.

Update (2026-10-14): amendments to specs not yet implemented were folded into the specs themselves (issue 005); this decision now lives in spec 02 (R-02.5, R-02.8), spec 04 (R-04.3), spec 05 (R-05.0, R-05.3), spec 09 (R-09.6) and spec 11 (R-11.2).
