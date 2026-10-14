# Spec 03 — Engine: value functions and utility (MAUT)

Status: todo
Phase: 0
Depends on: 02

## Goal

Score any package for one side: per-issue value 0–100, weighted total utility, hard-constraint filtering, euro equivalents and trade-off rates.

## Requirements

R-03.1 `valueOf(shape, level): number` in [0,100]:

- `increasing`: linear from worst→0 to best→100, clamped.
- `decreasing`: linear from worst→0 to best→100 where best < worst, clamped.
- `peaked`: 100 at `ideal`, linear down to 0 at each end of `worst` range.
- `ordinal`: lookup in `scores`; unknown level throws.

R-03.2 `utility(position, pkg): number` = Σ w_j · u_j(pkg_j) over `position.issues`. Issues missing from `pkg` throw.

R-03.3 `satisfies(position.constraints, pkg): boolean` with ops `<=`, `>=`, `==`, `!=`, `in`.

R-03.4 Weight presets for the free tier (and as counterpart priors):

| profile     | price | closingDays | costs |
| ----------- | ----- | ----------- | ----- |
| price_first | 0.60  | 0.20        | 0.20  |
| speed_first | 0.35  | 0.45        | 0.20  |
| balanced    | 0.45  | 0.30        | 0.25  |

R-03.5 Swing weighting helper: `weightsFromSwing(points: Record<IssueKey, number>)` normalises user points (0–100 per issue) to weights summing to 1.

R-03.6 Euro equivalence: `eurPerPoint(position) = |price.best − price.worst| × w_price / 100`. Used to translate any utility gap into euros. If price is not an issue, euro equivalents are omitted.

R-03.7 Trade-off rate between issues a and b for a level change Δ:
`rate = (w_a · Δu_a) / (w_b · Δu_b)` and the euro form `eurosFor(issue, fromLevel, toLevel) = w·Δu / (w_price · |∂u_price/∂€|)`.

R-03.8 Default ordinal score tables (overridable by user):

| issue               | buyer                           | seller                          |
| ------------------- | ------------------------------- | ------------------------------- |
| costs               | buyer 0 / split 50 / seller 100 | buyer 100 / split 50 / seller 0 |
| mortgageContingency | no 0 / yes 100                  | no 100 / yes 0                  |
| furniture           | none 0 / partial 50 / all 100   | none 100 / partial 50 / all 0   |

## Acceptance criteria

- AC-03.1 Freelance fixture: Ana's utility for (10,000 €, 4 wk, 60 %) = 45; Empresa X = 65.
- AC-03.2 `peaked` with worst [15,180], ideal 60 gives 100 at 60, 0 at 15 and 180, 50 at 120.
- AC-03.3 Values outside a range are clamped, never < 0 or > 100.
- AC-03.4 `weightsFromSwing({price:100, closingDays:50, costs:50})` → 0.5 / 0.25 / 0.25.
- AC-03.5 With price range 300k–340k and w_price 0.55, `eurPerPoint` = 220 €.
- AC-03.6 Property test: utility of any package is in [0,100].

## Files

`packages/engine/src/value.ts`, `utility.ts`, `constraints.ts`, `presets.ts`, tests.
