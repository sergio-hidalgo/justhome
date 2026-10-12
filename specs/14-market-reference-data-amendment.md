# Spec 14 — Amendment A: real CSV header, assumption rows, confidence lowering

Status: accepted
Amends: spec 14 (R-14.1, R-14.2, R-14.3, R-14.5, R-14.7)
Source: `issues/002-holding-cost-c-has-no-source.md` (option A), `issues/003-spec14-example-csv-uses-superseded-figures.md`
Applies: implement together with spec 14, in its commit. Where this file and spec 14 disagree, this file wins.

## Requirements

### R-14.A1 CSV format (replaces the example in R-14.1)

The header has 18 columns. The rows below are **placeholders**; no figure in them is real and none may be copied into code or tests. Real values are in `data/market/*.csv`.

```
level,ccaa,province,city,negotiation_margin,itp_rate,holding_A_low,holding_A_high,holding_B_low,holding_B_high,holding_C_low,holding_C_high,horizon_months,rent_per_m2,source_url,as_of,confidence,note
national,,,,<margin>,,<eur>,<eur>,<eur>,<eur>,<eur>,<eur>,<months>,<eur_m2>,<url>,<YYYY-MM-DD>,<low|medium|high>,<text>
ccaa,<ccaa>,,,,<itp>,,,,,,,,,<url>,<YYYY-MM-DD>,<low|medium|high>,<text>
city,<ccaa>,<province>,<city>,<margin>,,,,,,,,,<eur_m2>,<url>,<YYYY-MM-DD>,<low|medium|high>,<text>
```

Margins and rates are fractions (0.06 = 6 %); holding costs are € per month; empty cells inherit from the next level up (R-14.1).

### R-14.A2 Assumption markers

A value that is a modelling assumption rather than a sourced figure is declared in `note` with `ASSUMPTION(<field>[,<field>…])`, where field ∈ `negotiation_margin`, `itp_rate`, `holding_A`, `holding_B`, `holding_C`, `horizon_months`, `rent_per_m2`.

- A row that declares any assumed field must have `confidence = low`.
- R-14.2 is relaxed: `source_url` is still required, but when **every** populated value in a row is declared `ASSUMPTION`, it may be the repo path `docs/market-sources.md`. A row with at least one sourced value keeps its real URL.
- The importer rejects unknown field names inside `ASSUMPTION(...)` and rows that declare assumptions with `confidence` other than `low`.

### R-14.A3 Resolver provenance (extends R-14.3)

Each resolved value returns `{ value, level, source_url, as_of, confidence, note, assumed }`, where `assumed` is `true` when the supplying row declares that field as `ASSUMPTION`.

### R-14.A4 Confidence lowering (extends R-14.4 and R-14.7)

Counterpart confidence is lowered by one level (spec 05 R-05.5) **for each** of these conditions that holds:

1. the negotiation margin was supplied by a row with `confidence = low` (R-14.7);
2. the margin is older than 12 months (R-14.4);
3. the holding-cost range used for the scenario with the highest posterior probability has `assumed = true`.

The reductions **stack** and the result is floored at `low` (the free tier is always `low`, spec 05 AC-05.6). The engine applies this from the provenance carried in `EngineInput.market`.

### R-14.A5 Ordering

R-14.7 is read after R-14.6; requirement ids are unchanged.

## Acceptance criteria

- AC-14.5 The importer accepts a row declaring `ASSUMPTION(holding_C)` with `confidence = low`, and rejects the same row with `confidence = medium` and a row declaring `ASSUMPTION(holding_X)`.
- AC-14.6 Resolving any city present only in the seed CSV returns `holding_C = [400, 800]` with `assumed = true` and `level = national`.
- AC-14.7 Engine test: with scenario C as the modal posterior and an assumed range, counterpart confidence is one level lower than with a sourced range; with conditions 1 and 3 both true it is two levels lower; it never goes below `low`.
- AC-14.8 `data/market/2026-10-12.csv` imports cleanly (41 rows) and its national row carries `ASSUMPTION(holding_C)`.

## Files

`scripts/market-import.ts`, `apps/api/src/services/market.ts`, tests; `data/market/2026-10-12.csv` and `docs/market-sources.md` were updated with this amendment.
