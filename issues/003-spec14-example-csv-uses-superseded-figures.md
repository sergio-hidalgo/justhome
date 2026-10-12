# Issue 003: Spec 14 example CSV shows figures the constitution says must not be used

Status: resolved
Found while implementing: pre-implementation review (spec 14)
Affects specs: 14
Type: contradiction

## What happened

Spec 14 R-14.1 illustrates the CSV format with `national … 0.15 …` and `city … Madrid … 0.11 …`. R-14.5 and Constitution §9 state that the DeepSeek figures (national 15 %, Granada 35 %, Madrid 11 %) are superseded and "must not be used". The example header in R-14.1 also lacks the `confidence` and `note` columns that R-14.5 adds, and R-14.7 appears before R-14.6.

An agent copying the example into a test fixture or seed would reintroduce the superseded numbers.

## Expected

The format example is clearly illustrative, or uses obviously fake values, and shows the real header from `data/market/2026-10-12.csv`.

## Reproduce

1. Read spec 14 R-14.1 and compare with Constitution §9 and the real CSV header.

## Proposed resolution

Smallest change: a `14-market-reference-data-amendment.md` (or an edit approved by the owner) that replaces the example rows with placeholder values (`0.00`) and the real 18-column header. Until then agents must take the header from the CSV file and never copy numbers from the spec example. Tests use `data/market/2026-10-12.csv` or synthetic fixtures such as `fixtures/estimate-madrid.json`.

## Resolution

Decision (product owner, 2026-10-12): accept the proposed resolution — a spec 14 amendment replaces the example rows with placeholder values and the real 18-column header, and fixes the R-14.6 / R-14.7 order. Resolved by `specs/14-market-reference-data-amendment.md` (R-14.A1, R-14.A5).
