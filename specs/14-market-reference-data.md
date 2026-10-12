# Spec 14 — Market reference data (manual import)

Status: todo
Phase: 1
Depends on: 09, 11

## Goal

Engine priors (negotiation margins, holding-cost ranges, ITP rates, DOM adjustments, rent per m²) maintained by hand from public periodic sources, traceable to a source and date, replaceable later by automated feeds (D-09).

## Requirements

R-14.1 CSV format `data/market/<YYYY-MM-DD>.csv`:

```
level,ccaa,province,city,negotiation_margin,itp_rate,holding_A_low,holding_A_high,holding_B_low,holding_B_high,holding_C_low,holding_C_high,horizon_months,rent_per_m2,source_url,as_of
national,,,,0.15,,80,225,800,1500,400,800,3,,<url>,2026-09-30
ccaa,Comunidad de Madrid,,,,0.06,,,,,,,,,<url>,2026-01-01
city,Comunidad de Madrid,Madrid,Madrid,0.11,,,,,,,,,,<url>,2026-09-30
```

Empty cells inherit from the next level up.

R-14.2 CLI `pnpm market:import data/market/<file>.csv` (service role): validates with zod, rejects rows without `source_url`/`as_of`, upserts by (level, ccaa, province, city, as_of), prints a diff vs current values.

R-14.3 Resolver `resolveMarket(ccaa, province, city)` merges city → province → ccaa → national, newest `as_of` per level; returns each value with its provenance (`{value, level, source_url, as_of}`).

R-14.4 Staleness: values older than 12 months are flagged; analyses using them show "datos de mercado de <fecha>" in the dashboard; confidence drops one level if the margin is > 12 months old.

R-14.5 `docs/market-sources.md` lists the sources used and the update cadence (target: quarterly). The initial seed is `data/market/2026-10-12.csv` (41 rows, sourced 2026-10-12). It adds two columns to the format above: `confidence` (low/medium/high) and `note`; rows whose note starts with `VERIFY` are imported but flagged in the dashboard provenance until confirmed with the regional tax agency. The DeepSeek figures (national 15 %, Granada 35 %, Madrid 11 %) are superseded and must not be used.

R-14.7 Row `confidence = low` lowers the engine's counterpart confidence by one level when that row supplies the negotiation margin.

R-14.6 ITP rate by CCAA is needed only for the euro value of "seller assumes ITP"; when missing, the costs issue is shown without a euro equivalent.

## Acceptance criteria

- AC-14.1 Import rejects a row with no `source_url`.
- AC-14.2 Resolver falls back from an unknown city to its CCAA, then national.
- AC-14.3 Every engine output exposes `marketProvenance` for the margin used.
- AC-14.4 Stale-data flag appears for an `as_of` 13 months old.

## Files

`scripts/market-import.ts`, `apps/api/src/services/market.ts`, `data/market/`, `docs/market-sources.md`, tests.
