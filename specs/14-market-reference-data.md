# Spec 14 — Market reference data (manual import)

Status: todo
Phase: 1
Depends on: 09, 11

## Goal

Engine priors (negotiation margins, holding-cost ranges, ITP rates, DOM adjustments, rent per m²) maintained by hand from public periodic sources. Every value is traceable to a source, a date and a **measure kind** (D-19), with that source's reuse terms recorded. Automated feeds can replace the import later (D-09).

## Requirements

### R-14.1 CSV format `data/market/<YYYY-MM-DD>.csv`

The header has 20 columns. The rows below are **placeholders**: no figure in them is real, and none may be copied into code or tests. Real values are in `data/market/*.csv`.

```csv
level,ccaa,province,city,negotiation_margin,itp_rate,holding_A_low,holding_A_high,holding_B_low,holding_B_high,holding_C_low,holding_C_high,horizon_months,rent_per_m2,source_url,as_of,confidence,note,margin_kind,source_id
national,,,,<margin>,,<eur>,<eur>,<eur>,<eur>,<eur>,<eur>,<months>,<eur_m2>,<url>,<YYYY-MM-DD>,<low|medium|high>,<text>,<kind>,<source_id>
ccaa,<ccaa>,,,,<itp>,,,,,,,,,<url>,<YYYY-MM-DD>,<low|medium|high>,<text>,,<source_id>
city,<ccaa>,<province>,<city>,<margin>,,,,,,,,,<eur_m2>,<url>,<YYYY-MM-DD>,<low|medium|high>,<text>,<kind>,<source_id>
```

- Margins and rates are fractions (0.06 = 6 %). Holding costs are € per month. Empty cells inherit from the next level up.
- Rows whose `note` starts with `VERIFY` (or contains `VERIFY(<field>)`) are imported but flagged in the dashboard provenance until the value is confirmed (e.g. with the regional tax agency for ITP).

### R-14.2 Measure kind and source registry (D-19)

`margin_kind` is required whenever `negotiation_margin` is populated:

| value            | meaning                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `asking_to_sale` | (asking − final) / asking for the **same** properties                      |
| `market_gap`     | average asking vs average transaction prices, usually different properties |
| `listing_cut`    | asking-price reductions while listed; no closing price observed            |

- The engine uses `negotiation_margin` as the prior's mode whatever its kind (spec 05). The kind travels in provenance and in `assumption.market_low_confidence` (R-07.6).
- The engine's reservation range is **never** labelled with any of these kinds. Copy describes it as "rango de negociación estimado para esta vivienda".

Source registry `data/market/sources.csv`:

```csv
source_id,publisher,title,url,method_summary,reuse,license_url,checked_at
```

- `reuse` ∈ `cite_only` (quote with attribution; no redistribution of values), `aggregate_ok` (derived aggregates may be published), `open_license` (licence at `license_url`).
- Every market row's `source_id` must exist in the registry, and its `source_url` must belong to that source. Rows whose values are all assumptions use `source_id = internal_assumption`.

### R-14.3 Assumption markers

A value that is a modelling assumption rather than a sourced figure is declared in `note` with `ASSUMPTION(<field>[,<field>…])`, where field ∈ `negotiation_margin`, `itp_rate`, `holding_A`, `holding_B`, `holding_C`, `horizon_months`, `rent_per_m2`.

- A row that declares any assumed field must have `confidence = low`.
- `source_url` is always required. When **every** populated value in a row is declared `ASSUMPTION`, it may be the repo path `docs/market-sources.md`. A row with at least one sourced value keeps its real URL.

### R-14.4 Importer

CLI `pnpm market:import data/market/<file>.csv` (service role). It upserts `sources.csv` into `market_sources` first, then:

- validates rows with zod;
- rejects rows without `source_url` / `as_of`;
- rejects a margin without `margin_kind`, and a `listing_cut` row whose `confidence` is not `low`;
- rejects an unknown `source_id`, unknown field names inside `ASSUMPTION(...)`, and rows that declare assumptions with `confidence` other than `low`;
- warns when a source's `checked_at` is older than 12 months.

It upserts by (level, ccaa, province, city, as_of) and prints a diff against current values.

### R-14.5 Resolver

`resolveMarket(ccaa, province, city)` merges city → province → ccaa → national, newest `as_of` per level. Each value is returned with its provenance `{ value, level, sourceId, sourceUrl, asOf, confidence, note, assumed, reuse }`, and the margin also carries `marginKind`. `assumed` is `true` when the supplying row declares that field as `ASSUMPTION`. Engine output exposes `marketProvenance` for the margin used, including `marginKind`.

### R-14.6 Staleness and confidence

- Values older than 12 months are flagged; analyses using them show "datos de mercado de `<fecha>`" in the dashboard.
- Counterpart confidence is lowered by the engine from this provenance (spec 05 R-05.5): low-confidence margin row, margin older than 12 months, assumed holding range for the modal scenario. The reductions stack and are floored at `low`.

### R-14.7 ITP

The ITP rate by CCAA is needed only for the euro value of "seller assumes ITP". When it is missing, the costs issue is shown without a euro equivalent.

### R-14.8 Sources document and seed

`docs/market-sources.md` lists the sources used, their kind and reuse terms, candidate sources, and the update cadence (target: quarterly).

The initial seed is `data/market/2026-10-12.csv` (41 rows, sourced 2026-10-12). In this spec's commit it is migrated to the 20-column header:

- The national row is `listing_cut`, `confidence = low`, and carries `ASSUMPTION(holding_C)`.
- The Fotocasa city rows get the kind that matches Fotocasa's published method. Until that is verified they are `market_gap` with `VERIFY(margin_kind)` in `note`.
- `data/market/sources.csv` is created for every source in the seed.

The DeepSeek figures (national 15 %, Granada 35 %, Madrid 11 %) are superseded and must not be used.

## Acceptance criteria

- AC-14.1 Import rejects a row with no `source_url`.
- AC-14.2 Resolver falls back from an unknown city to its CCAA, then national.
- AC-14.3 Every engine output exposes `marketProvenance` for the margin used, including `marginKind`.
- AC-14.4 Stale-data flag appears for an `as_of` 13 months old.
- AC-14.5 The importer accepts a row declaring `ASSUMPTION(holding_C)` with `confidence = low`, and rejects the same row with `confidence = medium` and a row declaring `ASSUMPTION(holding_X)`.
- AC-14.6 Resolving any city present only in the seed CSV returns `holding_C = [400, 800]` with `assumed = true` and `level = national`.
- AC-14.8 `data/market/2026-10-12.csv` (41 rows, 20 columns) and `data/market/sources.csv` import cleanly; the national row carries `ASSUMPTION(holding_C)` and `margin_kind = listing_cut`.
- AC-14.9 The importer rejects a row with `negotiation_margin` and no `margin_kind`, a `listing_cut` row with `confidence = medium`, and a row whose `source_id` is not in `sources.csv`.
- AC-14.10 Resolving any seed city returns `marginKind` and `reuse` for the margin.

(AC-14.7, the engine-side confidence test, is AC-05.10.)

## Files

`scripts/market-import.ts`, `apps/api/src/services/market.ts`, `data/market/2026-10-12.csv`, `data/market/sources.csv`, `docs/market-sources.md`, tests.
