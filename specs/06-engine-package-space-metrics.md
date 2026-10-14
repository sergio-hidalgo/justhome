# Spec 06 — Engine: package space and equilibrium metrics

Status: todo
Phase: 0
Depends on: 03, 04, 05

## Goal

Enumerate feasible packages and compute ZOPA, Pareto frontier, Nash, Kalai-Smorodinsky, surplus, pie share and acceptance probability — against a known counterpart (joint mode) or an estimated one (draws).

## Requirements

R-06.1 **Discretisation.** Each issue → `levelsPerIssue` levels (default 5; free tier 3) evenly spaced across the union of both sides' ranges; ordinal/boolean issues use all their levels. Price levels are rounded to 1,000 €.

R-06.2 **Enumeration.** Cartesian product, filtered by the user's hard constraints. If the product exceeds 100,000, reduce levels on the lowest-weight issues until it fits, and return a `reducedResolution` notice.

R-06.3 **Point estimate.** For metrics shown as single numbers, the counterpart is the median draw (p50 BATNA, median weights). Called "estimated other side" in UI.

R-06.4 **Metrics per package ω** (vs point estimate):

| field          | definition                                    |
| -------------- | --------------------------------------------- |
| uMe, uOther    | utilities                                     |
| sMe, sOther    | U − b                                         |
| batnaCompliant | uMe ≥ bMe ∧ uOther ≥ bOther                   |
| inZopa         | uMe > bMe ∧ uOther > bOther (strict)          |
| pieShareMe     | sMe / (sMe + sOther) when both > 0            |
| acceptProb     | share of draws where U_other,d(ω) > b_other,d |
| eurMe          | sMe × eurPerPoint(me)                         |

R-06.5 **ZOPA:** packages with `inZopa`. **P(ZOPA)** = share of draws in which at least one enumerated package is in that draw's strict ZOPA.

R-06.6 **Pareto frontier:** ZOPA packages not weakly dominated (≥ on both, > on one) by another ZOPA package.

R-06.7 **Nash:** frontier package maximising `sMe × sOther`. **Tie-break** (|Δproduct| < 1e-9): (1) smaller |gMe − gOther| where g = proportional gain toward each side's ideal in the ZOPA (KS distance), (2) higher acceptProb, (3) lexical order of package levels.

R-06.8 **Kalai-Smorodinsky:** ideal point = (max uMe in ZOPA, max uOther in ZOPA). For each frontier package compute `gMe = (uMe − bMe)/(idealMe − bMe)`, `gOther` likewise; KS package = argmin |gMe − gOther|. Also return the continuous KS point by linear interpolation between adjacent frontier packages (for display only).

R-06.9 **Empty ZOPA:** return `zopa: []`, `nash: null`, and `widenHints`: issues not yet included, or included issues whose range could extend, ranked by how many additional packages would enter the ZOPA if added at default ranges.

R-06.10 **Performance:** 7 issues × 5 levels (78,125 packages) × 1,000 draws ⇒ analyse < 1 s p95 on CI hardware. Use typed arrays; precompute per-issue value tables.

## Acceptance criteria (see `fixtures/`)

- AC-06.1 Freelance: ZOPA = 5 packages; frontier = {(10k,4,40), (10k,4,60), (12k,4,20)}; Nash = (10k, 4 wk, 60 %), product 156.25, pie share 50/50.
- AC-06.2 Housing (recomputed): ZOPA = 10 packages; frontier = 5; Nash tie between (300k, 90 d, buyer pays) and (300k, 90 d, split), resolved by KS distance to **(300k, 90 d, split)**.
- AC-06.3 Property: Nash ∈ frontier ⊆ ZOPA whenever ZOPA non-empty.
- AC-06.4 Property: every frontier package is non-dominated within ZOPA.
- AC-06.5 With an infeasible setup (no overlap), `nash = null` and `widenHints` is non-empty.
- AC-06.6 Performance benchmark under budget.

## Files

`packages/engine/src/space.ts`, `metrics.ts`, `pareto.ts`, `nash.ts`, `ks.ts`, `bench/`, tests.
