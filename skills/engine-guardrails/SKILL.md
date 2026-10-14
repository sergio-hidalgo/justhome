---
name: engine-guardrails
description: Callable skill — the invariants of packages/engine (pure, deterministic, versioned, zero runtime deps). Invoke before writing or changing any code under packages/engine, any code that builds EngineInput or consumes EngineOutput, and when reviewing a diff that touches specs 03–08 or 19. Treat every item as blocking.
---

# Engine guardrails

"The engine is the product" (Constitution §2.6). Everything below comes from
`CONSTITUTION.md §5`, `AGENTS.md` and specs 03–08. If a rule conflicts with a
spec, stop and write an issue.

## 1. Purity and determinism

- [ ] No I/O: no `fs`, `fetch`, `process.env`, DB, logging side effects.
- [ ] No `Date.now()`, `new Date()` without an argument, `performance.now()`
      (outside `bench/`), or `Math.random()`. Anything time-dependent arrives as
      an input (dates are ISO strings, durations in days).
- [ ] Randomness only through `createRng(seed)` from
      `packages/engine/src/rng.ts`; seed = hash of the **normalised** inputs
      (`inputsHash`: canonical JSON, sorted keys, no `undefined`).
- [ ] Same inputs + same `ENGINE_VERSION` ⇒ byte-identical output. Therefore:
      no iteration order that depends on `Set`/`Map`/object-key insertion for
      anything ordered in the output (sort explicitly); fixed summation order;
      ties broken by the documented rule (spec 06 R-06.7: KS distance → acceptProb
      → lexical order of levels).
- [ ] No runtime dependency except the seeded PRNG. Types may be imported from
      `packages/schemas` with `import type`; zod is not loaded at runtime in the
      engine (validation happens at the API boundary).

## 2. Numbers and units

- [ ] Utilities live in [0,100], clamped; weights sum to 1 ± 1e-9 (assert on
      entry, normalise only where the spec says so).
- [ ] Inside the engine money is **euros (number)**; cents exist only at the
      API/DB boundary and are converted by `toEngine()` / `fromEngine()` in
      `packages/schemas` (R-02.7). No ad-hoc `* 100` / `/ 100`.
- [ ] Price levels are rounded to 1,000 € in discretisation (R-06.1); do not
      round anywhere else except at documented output boundaries.
- [ ] Money, percentages and utilities are never formatted as strings in the
      engine; explanations are `{ key, params }` (R-07.3) resolved by the web
      i18n layer. Counterpart-derived keys contain `.estimated`.

## 3. Which numbers may be constants (see `issues/001-*`)

| kind | rule |
|---|---|
| Market data — margins, ITP, holding-cost ranges, DOM adjustments, horizon months, rent €/m² | **Input only** (`EngineInput.market`, with provenance). Never a literal in engine code or tests outside fixtures. |
| Model parameters — scenario priors, Dirichlet presets, κ, band, headroom, anchor/light thresholds, timing ratio | Named constants in `packages/engine/src/params.ts` (spec 03's weight presets and default ordinal tables stay in `presets.ts`), each with a spec reference comment. Changing one is an engine change: bump `ENGINE_VERSION`. |
| Signal catalogue — likelihoods, batnaShift, weightNudge, margin deltas | Comes from the catalogue (DB is the source of truth), not hard-coded. Tests use a fixture catalogue. |

Decided in issue 001 (option A): follow the table. `EngineInput.catalog` is
defined in `specs/02-domain-types-and-schemas.md` (R-02.5, R-02.8); tests use
`packages/engine/test/catalog.fixture.ts`. Do not copy figures from spec tables into logic when the spec says
they are seeded or sourced
(spec 04 R-04.3 amounts are illustrative; `data/market/2026-10-12.csv` wins).
Superseded figures (national 15 %, Granada 35 %, Madrid 11 %) must never appear.

## 4. Structure

- [ ] `analyse(input): EngineOutput` is the single public entry point (R-07.5);
      internal modules are not re-exported.
- [ ] Every output carries `engineVersion` and `inputsHash`.
- [ ] Counterpart estimates are ranges + confidence, never a single certainty
      (Constitution §2.2). Free tier: confidence always `low` (AC-05.6).
- [ ] Free-tier locked fields (`frontier`, `ks`, `logrolling`, trade-off rates,
      `timing`) are `{ locked: true }` and contain **no** values anywhere in the
      output — including debug fields (R-07.4, AC-07.4).
- [ ] `draws` stay in memory for metrics and are never serialised or persisted.
- [ ] Joint mode (spec 19): output keeps each side's own surplus and BATNA in
      separate, per-side structures so the API can project per viewer. The engine
      never decides what a user may see.
- [ ] Invariants asserted by property tests: Nash ∈ frontier ⊆ ZOPA; frontier
      members mutually non-dominated; swap-symmetry; adding a dominated package
      does not change Nash.

## 5. Performance

- [ ] 7 issues × 5 levels × 1,000 draws: analyse < 1 s p95 (R-06.10).
      Precompute per-issue value tables; use typed arrays; avoid per-package
      object allocation in the inner loop; cap the product at 100,000 packages
      and return `reducedResolution` when reduced.

## 6. Change discipline

- Any change to an engine output (even a rounding) ⇒ bump `ENGINE_VERSION`,
  add a line to `packages/engine/CHANGELOG.md`, update the snapshots, in the
  same commit (R-08.4).
- A refactor must leave every golden test and snapshot untouched
  (`code-refactor`).
- A golden fixture that appears to disagree with the code is an issue, not an
  edit — fixtures are the reference (Constitution §9).
