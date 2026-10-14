# Spec 07 — Engine: strategy layer, traffic lights and explanations

Status: todo
Phase: 0
Depends on: 06

## Goal

Turn metrics into one recommended next action, a three-light summary and plain-language explanations — the same for buyer and seller.

## Requirements

R-07.1 **Traffic lights** (evaluated on the latest offer on the table, else on the Nash package):

| light | green                        | amber       | red             |
| ----- | ---------------------------- | ----------- | --------------- |
| batna | offer uMe ≥ bMe + 2 % of bMe | within ±2 % | below bMe − 2 % |
| zopa  | P(ZOPA) ≥ 0.70               | 0.30–0.70   | < 0.30          |
| pie   | pieShareMe 0.40–0.60         | 0.25–0.40   | < 0.25          |

R-07.2 **Strategy outputs**

- `anchor`: package maximising uMe among packages with acceptProb ≥ `ANCHOR_MIN_ACCEPT` (default 0.25).
- `reservation`: own BATNA package and its euro value.
- `recommended`: Nash package (or KS if Nash null and KS exists).
- `logrolling`: issues sorted by r = w_me / w_other_est. Lowest r → "concede", highest r → "ask". Each with euro trade value from spec 03.
- `timing`: compare own decay €/month vs counterpart decay p50 €/month → `wait` (theirs falls ≥ 1.5× faster), `move_now` (yours falls ≥ 1.5× faster), else `neutral`.
- `nextSignal`: from spec 05 R-05.6.
- `nextAction`: one of `make_offer(anchor)`, `hold_offer(days)`, `counter(pkg)`, `accept`, `walk_away`, `gather_info(signal)`, `widen_issues(hints)` — decision table:

| condition                                            | nextAction                                     |
| ---------------------------------------------------- | ---------------------------------------------- |
| ZOPA empty, P(ZOPA) < 0.30                           | widen_issues, else walk_away if no hints       |
| confidence low and a signal has high info gain       | gather_info                                    |
| no offer exchanged yet                               | make_offer(anchor)                             |
| received offer uMe ≥ uMe(Nash)                       | accept                                         |
| received offer in ZOPA but below Nash, timing = wait | hold_offer(14)                                 |
| received offer in ZOPA but below Nash                | counter(next frontier package toward Nash)     |
| received offer below own BATNA                       | counter(anchor) or walk_away if P(ZOPA) < 0.30 |

R-07.3 **Explanations:** every output field carries `explain: { key: string; params: Record<string, string|number> }`. Counterpart figures use keys containing `.estimated`. Keys resolve to text through `packages/i18n` (R-07.8), the same in the web app and in the PDF.

R-07.6 **Assumptions.** `assumptions: Explain[]` lists, deterministically and in this order, every input the engine filled in or took from an assumed source:

| key suffix                         | emitted when                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `assumption.unknown_answer`        | a counterpart quick answer is `'unknown'` and the prior was kept (params: question key)  |
| `assumption.default_wait_cost`     | own monthly wait cost was derived from market data (R-04.3) (params: range, source date) |
| `assumption.market_assumed`        | a market value used has `assumed = true` (params: field)                                 |
| `assumption.market_low_confidence` | the margin row has `confidence = low` (params: `marginKind`, `asOf`)                     |
| `assumption.model_parameter`       | always once, pointing at the methodology page of the DOM table and scenario priors       |
| `assumption.default_status_quo`    | counterpart status-quo levels came from scenario defaults (R-05.1.5)                     |

R-07.7 **Limitations.** `limitations: Explain[]`, deterministic, in this order:

| key suffix                         | emitted when                                                                |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `limitation.estimated_counterpart` | the counterpart is estimated (not joint mode)                               |
| `limitation.free_tier`             | `tier = 'free'` (fewer draws, 3 issues, confidence capped)                  |
| `limitation.reduced_resolution`    | R-06.2 reduced levels                                                       |
| `limitation.market_average`        | a market margin is used: an average cannot fix the discount on one property |
| `limitation.stale_market`          | a market value older than 12 months was used (R-14.4)                       |
| `limitation.no_offer_yet`          | no offer exchanged; acceptance probabilities are model-based only           |

`assumptions` and `limitations` are never locked in the free tier. The dashboards (specs 16, 17) show them in a collapsible "Supuestos y límites" panel; the PDF prints them (spec 18).

R-07.8 **Shared explanation text.** Workspace package `packages/i18n` holds `engine.es.json`, `engine.en.json` and `renderExplain(explain, locale): string`, which formats numbers, currency and dates with `Intl`. Every engine key lives only there. `apps/web/src/i18n/{es,en}.json` keep UI strings only. `packages/i18n` depends on `packages/schemas` only; the engine does not depend on it.

R-07.4 **Free tier output:** lights, recommended package, own surplus, nextAction. Frontier, KS, logrolling, trade-off rates and timing are returned as `locked: true` with no values.

R-07.5 `analyse(input: EngineInput): EngineOutput` is the single public entry point composing specs 03–07.

## Acceptance criteria

- AC-07.1 Freelance with no offers ⇒ nextAction `make_offer`, recommended = Nash fixture.
- AC-07.2 Received offer equal to Nash ⇒ `accept`.
- AC-07.3 Received offer below own BATNA and P(ZOPA) 0.1 ⇒ `walk_away` when no widen hints.
- AC-07.4 Free tier output contains no frontier values (`locked: true`).
- AC-07.5 Every counterpart-derived explanation key contains `.estimated`.
- AC-07.6 An input with two `'unknown'` quick answers and an assumed holding range yields exactly those `assumption.*` entries, in order; identical input gives byte-identical arrays.
- AC-07.7 Free-tier output contains `limitations` with `limitation.free_tier` and is not `locked`.
- AC-07.8 Every key emitted by `analyse()` over the golden fixtures and 200 property-test inputs exists in both `engine.es.json` and `engine.en.json`.
- AC-07.9 `renderExplain` produces locale-correct currency ("1.000 €" for es, "€1,000" for en) for a cents param.

## Files

`packages/engine/src/strategy.ts`, `lights.ts`, `explain.ts`, `analyse.ts`, `packages/i18n/**` (new package), tests.
