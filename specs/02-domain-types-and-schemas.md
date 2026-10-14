# Spec 02 — Domain types and shared schemas

Status: todo
Phase: 0
Depends on: 01

## Goal

One definition of every domain object, as Zod schemas with inferred TS types, used by engine, API and web forms.

## Scope

In: `packages/schemas` — issue catalogue, positions, counterparts, signals, signal catalogue, offers, market reference, engine input/output, form step schemas for both roles.
Out: persistence, engine logic.

### Where the engine's numbers live

| kind                                                                                                                                                               | lives in                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Market data (margin and its kind, ITP, holding-cost ranges, DOM adjustments, horizon months, rent €/m²)                                                            | `EngineInput.market`, never in engine code                                                                                   |
| Model parameters (scenario priors, Dirichlet presets, κ rule, `band`, buyer `headroom`, default draws, status-quo closing levels per scenario, spec 07 thresholds) | named constants in `packages/engine/src/params.ts`; spec 03's weight presets and default ordinal tables stay in `presets.ts` |
| Signal catalogue (likelihoods, `batnaShift`, `weightNudge`, margin deltas, question keys)                                                                          | `EngineInput.catalog`; the `signal_catalog` table is the source of truth                                                     |

## Requirements

### R-02.1 Issue catalogue

```ts
type IssueKey =
  | 'price'
  | 'closingDays'
  | 'costs'
  | 'arrasPct'
  | 'mortgageContingency'
  | 'furniture'
  | 'rentBackDays';

type IssueKind = 'monetary' | 'numeric' | 'ordinal' | 'boolean';

interface IssueDef {
  key: IssueKey;
  kind: IssueKind;
  unit: 'EUR' | 'days' | 'pct' | null;
  levels?: string[]; // ordinal/boolean, ordered
  defaultRange?: [number, number];
  freeTier: boolean; // true for price, closingDays, costs
}
```

| key                 | kind     | unit | default range / levels                                           | freeTier |
| ------------------- | -------- | ---- | ---------------------------------------------------------------- | -------- |
| price               | monetary | EUR  | user-defined                                                     | ✔        |
| closingDays         | numeric  | days | 15–180                                                           | ✔        |
| costs               | ordinal  | —    | `buyer`, `split`, `seller` (seller assumes ITP ≙ price discount) | ✔        |
| arrasPct            | numeric  | pct  | 5–15                                                             |          |
| mortgageContingency | boolean  | —    | `no`, `yes`                                                      |          |
| furniture           | ordinal  | —    | `none`, `partial`, `all`                                         |          |
| rentBackDays        | numeric  | days | 0–90                                                             |          |

### R-02.2 Value function spec (per side, per issue)

```ts
type Shape =
  | { type: 'increasing'; worst: number; best: number } // numeric/monetary
  | { type: 'decreasing'; worst: number; best: number }
  | { type: 'peaked'; worst: [number, number]; ideal: number } // e.g. closing date
  | { type: 'ordinal'; scores: Record<string, number> }; // level -> 0..100
```

### R-02.3 Position (the user's side)

```ts
interface Position {
  role: 'buyer' | 'seller';
  issues: IssueKey[]; // selected issues
  shapes: Partial<Record<IssueKey, Shape>>;
  weights: Partial<Record<IssueKey, number>>; // Σ = 1
  constraints: HardConstraint[]; // e.g. { issue:'price', op:'<=', value:320000 }
  batna: OwnBatnaInput; // spec 04
  weightProfile?: 'price_first' | 'speed_first' | 'balanced'; // free tier
}
```

### R-02.4 Counterpart, signals, offers

```ts
type Scenario = 'A' | 'B' | 'C'; // seller scenarios
type BuyerScenario = 'renting_flexible' | 'renting_deadline' | 'owner_chain' | 'cash_investor';

interface CounterpartInput {
  id: string;
  label: string;
  role: 'buyer' | 'seller'; // role of the counterpart
  answers: Record<string, string>; // quick form answers, may be 'unknown'
  signals: SignalEvent[];
  offers: Offer[];
}

interface SignalEvent {
  code: string;
  value?: string | number;
  credibility?: number;
  at: string;
}
interface Offer {
  direction: 'sent' | 'received';
  pkg: Package;
  at: string;
}
type Package = Partial<Record<IssueKey, number | string>>;
```

### R-02.5 Engine I/O

`EngineInput = { me: Position; other: CounterpartInput | KnownPosition; property: PropertyFacts; market: MarketReference; catalog: SignalCatalogEntry[]; tier: 'free' | 'paid'; options?: { draws?: number; levelsPerIssue?: number } }`

- `catalog` is required. An empty array is valid (no signal has any effect).
- Every `signals[].code` in `other` must exist in `catalog`; otherwise validation fails with a `validation` error naming the code. The engine never silently ignores an unknown signal.
- The API passes the full catalogue. Tier gating of signal _logging_ stays in R-09.4 and R-12.2.
- `MarketReference` carries, for each value, its provenance `{ value, level, sourceId, sourceUrl, asOf, confidence, note, assumed }`, and for the negotiation margin also `marginKind` (spec 14 R-14.2).

`EngineOutput` = everything listed in specs 04–07 (BATNAs, estimate, metrics, packages, recommendation, lights, strategy, `assumptions`, `limitations`, explanations as `{ key, params }`) plus `engineVersion`, `inputsHash`, `marketProvenance`.

`inputsHash` is computed over the canonical form of the whole `EngineInput`, **including `catalog`** with entries sorted by `code`. A changed catalogue therefore changes the PRNG seed, the output and the cache key.

### R-02.8 `SignalCatalogEntry` (`catalog.ts`)

```ts
interface SignalCatalogEntry {
  code: string;
  role: 'buyer' | 'seller'; // role of the user logging it
  appliesTo: string; // as stored in signal_catalog.applies_to
  labelKey: string;
  likelihood: Partial<Record<Scenario | BuyerScenario, number>>; // each value in [0, 1]
  batnaShift?: { pct: number; credibilityDefault: number };
  weightNudge?: Partial<Record<IssueKey, number>>;
  marginDelta?: number;
  questionKeys: string[];
  tier: 'free' | 'paid';
}
```

Exported with its zod schema `signalCatalogEntry` and the inferred type. `catalogFromRows(rows)` maps `signal_catalog` rows (snake_case, spec 09) to `SignalCatalogEntry[]` and validates them. The API uses it; the engine never sees DB rows.

### R-02.9 Field descriptions

Every field of every schema carries a `.describe()` in English: meaning, unit (cents, days, fraction) and whether `'unknown'` is allowed. OpenAPI (spec 11) is generated from these.

### R-02.6 Form schemas

- `buyerPropertyStep`, `buyerPositionStep`, `buyerPrioritiesStep`, `buyerSellerStep`
- `sellerPropertyStep`, `sellerPositionStep`, `sellerPrioritiesStep`, `sellerOfferStep`
- `signalLogEntry`
- Each schema exports `free` and `paid` variants (free = only fields marked F in the product doc).
- Every enum question includes `'unknown'`.

### R-02.7 Money and units

API-facing schemas use integer cents (`priceCents`); `toEngine()` / `fromEngine()` mappers convert to euros.

## Acceptance criteria

- AC-02.1 All schemas compile and export inferred types.
- AC-02.2 `Position` with weights summing to 0.98 fails validation; 1.0 ± 1e-9 passes.
- AC-02.3 Free-tier `buyerPrioritiesStep` rejects any issue outside price/closingDays/costs.
- AC-02.4 Every enum field in form schemas accepts `'unknown'`.
- AC-02.5 `toEngine(fromEngine(x))` round-trips money exactly.
- AC-02.6 `signalCatalogEntry` accepts every row of the spec 05 seed table and rejects a likelihood outside [0, 1].
- AC-02.7 An `EngineInput` without `catalog` fails validation; with `catalog: []` it passes.
- AC-02.8 A signal whose `code` is not in `catalog` fails validation naming the code.
- AC-02.9 `catalogFromRows` round-trips the seed rows to entries and rejects a malformed `likelihood`.
- AC-02.10 Every schema field has a non-empty description.

## Files

`packages/schemas/src/{issues,shapes,position,counterpart,catalog,market,engine-io,forms,money}.ts`, tests alongside.
