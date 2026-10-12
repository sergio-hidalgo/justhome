# Spec 02 — Domain types and shared schemas

Status: todo
Phase: 0
Depends on: 01

## Goal

One definition of every domain object, as Zod schemas with inferred TS types, used by engine, API and web forms.

## Scope

In: `packages/schemas` — issue catalogue, positions, counterparts, signals, offers, engine input/output, form step schemas for both roles.
Out: persistence, engine logic.

## Requirements

### R-02.1 Issue catalogue

```ts
type IssueKey = 'price' | 'closingDays' | 'costs' | 'arrasPct'
              | 'mortgageContingency' | 'furniture' | 'rentBackDays';

type IssueKind = 'monetary' | 'numeric' | 'ordinal' | 'boolean';

interface IssueDef {
  key: IssueKey;
  kind: IssueKind;
  unit: 'EUR' | 'days' | 'pct' | null;
  levels?: string[];          // ordinal/boolean, ordered
  defaultRange?: [number, number];
  freeTier: boolean;          // true for price, closingDays, costs
}
```

| key | kind | unit | default range / levels | freeTier |
|---|---|---|---|---|
| price | monetary | EUR | user-defined | ✔ |
| closingDays | numeric | days | 15–180 | ✔ |
| costs | ordinal | — | `buyer`, `split`, `seller` (seller assumes ITP ≙ price discount) | ✔ |
| arrasPct | numeric | pct | 5–15 | |
| mortgageContingency | boolean | — | `no`, `yes` | |
| furniture | ordinal | — | `none`, `partial`, `all` | |
| rentBackDays | numeric | days | 0–90 | |

### R-02.2 Value function spec (per side, per issue)

```ts
type Shape =
  | { type: 'increasing'; worst: number; best: number }       // numeric/monetary
  | { type: 'decreasing'; worst: number; best: number }
  | { type: 'peaked'; worst: [number, number]; ideal: number } // e.g. closing date
  | { type: 'ordinal'; scores: Record<string, number> };       // level -> 0..100
```

### R-02.3 Position (the user's side)

```ts
interface Position {
  role: 'buyer' | 'seller';
  issues: IssueKey[];                         // selected issues
  shapes: Partial<Record<IssueKey, Shape>>;
  weights: Partial<Record<IssueKey, number>>; // Σ = 1
  constraints: HardConstraint[];              // e.g. { issue:'price', op:'<=', value:320000 }
  batna: OwnBatnaInput;                       // spec 04
  weightProfile?: 'price_first' | 'speed_first' | 'balanced'; // free tier
}
```

### R-02.4 Counterpart, signals, offers

```ts
type Scenario = 'A' | 'B' | 'C';            // seller scenarios
type BuyerScenario = 'renting_flexible' | 'renting_deadline' | 'owner_chain' | 'cash_investor';

interface CounterpartInput {
  id: string; label: string;
  role: 'buyer' | 'seller';                 // role of the counterpart
  answers: Record<string, string>;          // quick form answers, may be 'unknown'
  signals: SignalEvent[];
  offers: Offer[];
}

interface SignalEvent { code: string; value?: string | number; credibility?: number; at: string }
interface Offer { direction: 'sent' | 'received'; pkg: Package; at: string }
type Package = Partial<Record<IssueKey, number | string>>;
```

### R-02.5 Engine I/O

`EngineInput = { me: Position; other: CounterpartInput | KnownPosition; property: PropertyFacts; market: MarketReference; tier: 'free' | 'paid'; options?: { draws?: number; levelsPerIssue?: number } }`

`EngineOutput` = everything listed in specs 04–07 (BATNAs, estimate, metrics, packages, recommendation, lights, strategy, explanations as i18n keys + params) plus `engineVersion`, `inputsHash`.

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

## Files

`packages/schemas/src/{issues,shapes,position,counterpart,engine-io,forms,money}.ts`, tests alongside.
