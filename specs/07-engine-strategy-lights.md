# Spec 07 — Engine: strategy layer, traffic lights and explanations

Status: todo
Phase: 0
Depends on: 06

## Goal

Turn metrics into one recommended next action, a three-light summary and plain-language explanations — the same for buyer and seller.

## Requirements

R-07.1 **Traffic lights** (evaluated on the latest offer on the table, else on the Nash package):

| light | green | amber | red |
|---|---|---|---|
| batna | offer uMe ≥ bMe + 2 % of bMe | within ±2 % | below bMe − 2 % |
| zopa | P(ZOPA) ≥ 0.70 | 0.30–0.70 | < 0.30 |
| pie | pieShareMe 0.40–0.60 | 0.25–0.40 | < 0.25 |

R-07.2 **Strategy outputs**
- `anchor`: package maximising uMe among packages with acceptProb ≥ `ANCHOR_MIN_ACCEPT` (default 0.25).
- `reservation`: own BATNA package and its euro value.
- `recommended`: Nash package (or KS if Nash null and KS exists).
- `logrolling`: issues sorted by r = w_me / w_other_est. Lowest r → "concede", highest r → "ask". Each with euro trade value from spec 03.
- `timing`: compare own decay €/month vs counterpart decay p50 €/month → `wait` (theirs falls ≥ 1.5× faster), `move_now` (yours falls ≥ 1.5× faster), else `neutral`.
- `nextSignal`: from spec 05 R-05.6.
- `nextAction`: one of `make_offer(anchor)`, `hold_offer(days)`, `counter(pkg)`, `accept`, `walk_away`, `gather_info(signal)`, `widen_issues(hints)` — decision table:

| condition | nextAction |
|---|---|
| ZOPA empty, P(ZOPA) < 0.30 | widen_issues, else walk_away if no hints |
| confidence low and a signal has high info gain | gather_info |
| no offer exchanged yet | make_offer(anchor) |
| received offer uMe ≥ uMe(Nash) | accept |
| received offer in ZOPA but below Nash, timing = wait | hold_offer(14) |
| received offer in ZOPA but below Nash | counter(next frontier package toward Nash) |
| received offer below own BATNA | counter(anchor) or walk_away if P(ZOPA) < 0.30 |

R-07.3 **Explanations:** every output field carries `explain: { key: string; params: Record<string, string|number> }` resolved by the web i18n layer. Counterpart figures use keys containing `.estimated`.

R-07.4 **Free tier output:** lights, recommended package, own surplus, nextAction. Frontier, KS, logrolling, trade-off rates and timing are returned as `locked: true` with no values.

R-07.5 `analyse(input: EngineInput): EngineOutput` is the single public entry point composing specs 03–07.

## Acceptance criteria

- AC-07.1 Freelance with no offers ⇒ nextAction `make_offer`, recommended = Nash fixture.
- AC-07.2 Received offer equal to Nash ⇒ `accept`.
- AC-07.3 Received offer below own BATNA and P(ZOPA) 0.1 ⇒ `walk_away` when no widen hints.
- AC-07.4 Free tier output contains no frontier values (`locked: true`).
- AC-07.5 Every counterpart-derived explanation key contains `.estimated`.

## Files

`packages/engine/src/strategy.ts`, `lights.ts`, `explain.ts`, `analyse.ts`, tests.
