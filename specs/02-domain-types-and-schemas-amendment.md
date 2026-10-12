# Spec 02 — Amendment A: signal catalogue as an engine input, and where model numbers live

Status: accepted
Amends: spec 02 (R-02.5, Files), spec 04 (R-04.3), spec 05 (R-05.1, R-05.3, Files), spec 09 (R-09.6), spec 11 (R-11.2)
Source: `issues/001-engine-constants-vs-market-inputs.md` (decision: option A, hybrid)
Applies: implement together with each amended spec, in that spec's commit. Where this file and the amended spec disagree, this file wins.

## Goal

Make the engine's three kinds of number explicit and give the pure engine a way to receive the signal catalogue without reading the database.

| kind | lives in |
|---|---|
| Market data (margin, ITP, holding-cost ranges, DOM adjustments, horizon months, rent €/m²) | `EngineInput.market`, never in engine code |
| Model parameters (scenario priors, Dirichlet presets, κ rule, `band`, buyer `headroom`, default draws, status-quo closing levels per scenario, spec 07 thresholds) | named constants in `packages/engine/src/params.ts`; spec 03's weight presets and default ordinal tables stay in `presets.ts` |
| Signal catalogue (likelihoods, `batnaShift`, `weightNudge`, margin deltas, question keys) | `EngineInput.catalog`; the `signal_catalog` table is the source of truth |

## Requirements

### R-02.A1 `SignalCatalogEntry` (new, `packages/schemas/src/catalog.ts`)

```ts
interface SignalCatalogEntry {
  code: string;
  role: 'buyer' | 'seller';                   // role of the user logging it
  appliesTo: string;                          // as stored in signal_catalog.applies_to
  labelKey: string;
  likelihood: Partial<Record<Scenario | BuyerScenario, number>>; // each value in [0, 1]
  batnaShift?: { pct: number; credibilityDefault: number };
  weightNudge?: Partial<Record<IssueKey, number>>;
  marginDelta?: number;
  questionKeys: string[];
  tier: 'free' | 'paid';
}
```

Exported with its zod schema `signalCatalogEntry` and the inferred type.

### R-02.A2 `EngineInput` (replaces the definition in R-02.5)

`EngineInput = { me: Position; other: CounterpartInput | KnownPosition; property: PropertyFacts; market: MarketReference; catalog: SignalCatalogEntry[]; tier: 'free' | 'paid'; options?: { draws?: number; levelsPerIssue?: number } }`

- `catalog` is required. An empty array is valid (no signal has any effect).
- Every `signals[].code` in `other` must exist in `catalog`; otherwise input validation fails with a `validation` error naming the code. The engine never silently ignores an unknown signal.
- The API passes the full catalogue. Tier gating of signal *logging* stays as in R-09.4 and R-12.2.

### R-02.A3 `inputsHash`

`inputsHash` is computed over the canonical form of the whole `EngineInput`, **including `catalog`** with entries sorted by `code`. A changed catalogue therefore changes the PRNG seed, the output and the cache key.

### R-02.A4 Row mapper

`catalogFromRows(rows)` in `packages/schemas/src/catalog.ts` maps `signal_catalog` rows (snake_case, spec 09) to `SignalCatalogEntry[]` and validates them. The API uses it; the engine never sees DB rows.

### R-02.A5 Effects on other specs

- **Spec 04 R-04.3:** the amounts in the table (80–225 €, 800–1,500 €, 400–800 €) are illustrative. Wait-cost ranges come from `input.market` (spec 14 resolver); the seed CSV wins. Tests use a test-local market object.
- **Spec 05 R-05.1 / R-05.3:**
  - R-05.3 reads likelihoods, shifts and nudges from `input.catalog`, not from a constant and not from the database.
  - The tables in R-05.1.3 (scenario priors) and R-05.1.6 (Dirichlet presets, κ rule), `band` = 0.03, buyer `headroom` ~ Triangular(0, 0.03, 0.08), default `draws` (1,000 / free 300) and the scenario status-quo closing levels (R-05.1.5) are model parameters: constants in `packages/engine/src/params.ts`, each with a comment citing the requirement. Changing one is an engine change (`ENGINE_VERSION` bump + CHANGELOG, R-08.4).
  - `H` (months to next comparable offer), decay ranges and rent come from `input.market`.
  - Files add: `packages/engine/src/params.ts`, `packages/engine/test/catalog.fixture.ts` (the spec 05 seed table as `SignalCatalogEntry[]`, used by tests).
- **Spec 09 R-09.6:** `supabase/seed.sql` must contain exactly the catalogue in `catalog.fixture.ts`.
- **Spec 11 R-11.2:** the analyse pipeline loads the catalogue rows, maps them with `catalogFromRows`, and passes them as `catalog`. It may cache them in-process; because the catalogue is part of `inputs_hash`, a changed catalogue never returns a stale cached analysis.

## Acceptance criteria

- AC-02.6 `signalCatalogEntry` accepts every row of the spec 05 seed table and rejects a likelihood outside [0, 1].
- AC-02.7 An `EngineInput` without `catalog` fails validation; with `catalog: []` it passes.
- AC-02.8 A signal whose `code` is not in `catalog` fails validation naming the code.
- AC-02.9 `catalogFromRows` round-trips the seed rows to entries and rejects a malformed `likelihood`.
- AC-05.8 Changing one likelihood in `catalog` changes `inputsHash`.
- AC-05.9 Estimation modules contain no market literal: margins, holding-cost ranges and rent are read only from `input.market` (test passes a market object and asserts outputs follow it).
- AC-09.8 Integration test (Vitest against local Supabase after `pnpm db:reset`): the rows of `signal_catalog` equal `catalog.fixture.ts` after `catalogFromRows`.
- AC-11.6 After changing a catalogue row, an otherwise identical analyse call does not return the cached `analysisId`.

## Files

`packages/schemas/src/catalog.ts` (+ export from `index.ts`), `packages/engine/src/params.ts`, `packages/engine/test/catalog.fixture.ts`, tests alongside.
