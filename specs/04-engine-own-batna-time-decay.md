# Spec 04 — Engine: own BATNA and time decay

Status: todo
Phase: 0
Depends on: 03

## Goal

Compute the user's own BATNA as a utility and its euro equivalent today and at future horizons, for both roles.

## Requirements

R-04.1 Input:

```ts
interface OwnBatnaInput {
  alternative: Package | null;      // best alternative deal; null = "keep status quo"
  statusQuo?: Package;              // seller: keep the home at current asking terms; buyer: keep renting
  monthlyWaitCost: number;          // € per month of waiting (user-entered or derived)
  monthlyOpportunityCost?: number;  // € per month (seller B/C, investor)
  alternativeExpiresInDays?: number;
}
```

R-04.2 `batnaUtility(position, input, months = 0)`:
`U(alt) − (monthlyWaitCost + monthlyOpportunityCost) × months / eurPerPoint`, floored at 0.

R-04.3 Derived wait costs (used when the user leaves the field empty; values come from `market_reference`, never constants):

| role / situation | default monthly wait cost |
|---|---|
| buyer renting | current rent € |
| seller A — lives there, not bought | holding cost range low–high (seeded 80–225 €) |
| seller B — already bought, double burden | 800–1,500 € |
| seller C — needs to sell to buy | 400–800 € |
| unknown | weighted mean of A/B/C by prior (≈ 400 €) |

For the user's own BATNA the midpoint of the range is used; the range is shown in UI.

R-04.4 Output: `{ today: {points, eur}, horizons: [{months:1|3|6, points, eur}], decayPerMonthEur, decayPerMonthPoints }`.

R-04.5 If `alternativeExpiresInDays` passes before a horizon, that horizon's BATNA uses `statusQuo` instead of `alternative`.

## Acceptance criteria

- AC-04.1 Freelance fixture: Ana BATNA = 32.5, Empresa X BATNA = 52.5 (months = 0).
- AC-04.2 Housing fixture (recomputed): buyer Ana BATNA = 41.25, seller Carlos BATNA = 26.25.
- AC-04.3 Seller scenario B with 1,000 €/month and eurPerPoint 200: BATNA falls 5 points per month.
- AC-04.4 BATNA never negative.
- AC-04.5 An alternative expiring in 45 days is replaced by status quo at the 3-month horizon.

## Files

`packages/engine/src/batna.ts`, tests.
