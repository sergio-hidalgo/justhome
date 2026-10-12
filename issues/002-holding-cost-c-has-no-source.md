# Issue 002: Scenario C holding cost has no sourced value and nowhere to fall back to

Status: resolved
Found while implementing: pre-implementation review (specs 04, 14)
Affects specs: 04, 05, 14
Type: gap

## What happened

`data/market/2026-10-12.csv` national row has `holding_C_low` / `holding_C_high` empty; its note says "C not published -> keep model range 400-800 until sourced". Spec 14 R-14.1 says empty cells inherit from the next level up, but national is the top level, so there is nothing to inherit. Spec 04 R-04.3 says wait costs "come from `market_reference`, never constants". Result: for seller scenario C the engine has no value, and putting 400–800 in code would break the rule.

Related staleness: spec 04 R-04.3 quotes A = 80–225 € and B = 800–1,500 €; the CSV has A = 183 € and B = 417 € (mortgage excluded). `docs/market-sources.md` records C 400–800 as "an assumption".

## Expected

Every scenario's wait-cost range is resolvable from `market_reference`, with provenance, or the engine has a defined behaviour when it is missing (Constitution §2.2: estimates carry a range and confidence).

## Reproduce

1. Run the spec 14 resolver for any city → `holding_C` is `null`.
2. Run spec 05 with scenario C posterior > 0.

## Proposed resolution

- **A (recommended):** add the assumption to the national CSV row (`holding_C_low=400`, `holding_C_high=800`) with `confidence=low` and a note "assumption — no published figure". Relax R-14.2 for rows explicitly flagged `ASSUMPTION` so the missing `source_url` is replaced by a pointer to `docs/market-sources.md`. Counterpart confidence drops one level when C supplies the decay (same mechanism as R-14.7).
- **B:** leave C empty; the engine treats a missing range as "scenario C unavailable" and renormalises the posterior over A/B, with a `lowConfidence` notice. Honest but loses the C scenario that the model and signal catalogue are built around.
- **C:** hard-code 400–800 as a model parameter (issue 001). Violates the constitution's wording; not recommended.

## Resolution

Decision (product owner, 2026-10-12): **option A**.

- National row gets `holding_C_low = 400`, `holding_C_high = 800`, `confidence = low`, note starting `ASSUMPTION`.
- Spec 14 R-14.2 is relaxed for `ASSUMPTION` rows: `source_url` may point to `docs/market-sources.md`.
- Counterpart confidence drops one level when scenario C supplies the decay (same mechanism as R-14.7).

Resolved by `specs/14-market-reference-data-amendment.md` and the national row of `data/market/2026-10-12.csv` (`holding_C` 400–800, `ASSUMPTION(holding_C)`, confidence low). Details settled in the amendment: the national row keeps its real `source_url`, so the `docs/market-sources.md` relaxation only applies to rows made entirely of assumptions; the confidence drop applies when the modal scenario's range is assumed, and market-data confidence drops stack, one level each, floored at `low` (product owner, 2026-10-12).
