# Spec 21 — Market intelligence: city pages, periodic studies and datasets

Status: todo
Phase: 2
Depends on: 14, 20

## Goal

Publish original, sourced and periodically refreshed Spanish negotiation-market intelligence that people and AI assistants can cite. Each figure states its measure kind, source, period, geography and method, and links into the tool. This is the main reason an assistant has to reference this site rather than restate generic advice.

## Scope

In: `/mercado`, `/mercado/[ciudad]`, `/mercado/estudios/[slug]`, dataset files, Dataset JSON-LD, publication rules.
Out: automated data feeds (D-09 still manual), use of platform user data (R-21.7 sets the gate only).

## Requirements

### R-21.1 Publication threshold (D-19)

`/mercado/[ciudad]` exists only for a city with at least one city-level value that is sourced (not `ASSUMPTION`), not stale (≤ 12 months) and from a source whose `reuse` is not unknown. Other cities have no page. They appear on `/mercado` under "sin datos locales suficientes; se usa la referencia nacional". The build derives the city list from the latest imported snapshot; no hand-maintained list.

### R-21.2 City page

Rendered from the resolver (spec 14) at build time:

- `<h1>` "Margen de negociación en `<ciudad>`: qué dicen los datos" and an answer-first block (R-20.2).
- A table of every available measure: value, **kind** (D-19 label), source (linked), period/`as_of`, confidence, and whether it is inherited from a higher level.
- "Qué significa si compras" and "qué significa si vendes", each ending in `<ToolEntry>` prefilled with `ccaa` and `municipio`.
- Fixed section "Por qué un promedio no te dice el descuento de tu vivienda". It explains the difference between the three market measures and the estimated range for one property, and links to `/metodologia/medidas-de-mercado`.
- Rent €/m² and time-to-sell when available, each with its source.

### R-21.3 Measures never mixed

- Tables always carry a kind column. Charts never place two kinds on one series or axis without labelling each point's kind.
- Comparative sentences come from i18n templates that name both kinds, e.g. "la rebaja media de anuncios (listing cut) no es el descuento final de cierre".
- No page, dataset or API response computes a new figure by combining kinds (e.g. averaging a `listing_cut` with an `asking_to_sale`).

### R-21.4 Studies

`/mercado/estudios/[slug]`, each a content entry in `apps/web/src/content/estudios/{es,en}/` with frontmatter: `title`, `question` (e.g. "¿Cuánto margen de negociación hay realmente al comprar en Barcelona?"), `answer`, `period` (`YYYY-Qn` or `YYYY-Hn`), `geography`, `snapshot` (the `data/market/<date>.csv` it is frozen on), `version`, `methodology` (summary + link), `supersedes?`, `corrections[]`.

- Every figure comes from the frozen snapshot via `<MarketFigure snapshot=…>`, so a later import never changes a published study.
- Required sections: answer; key figures with kinds; trend versus the previous period (only when the same kind and source exist for both); local variation; time-on-market; method and sources with reuse status; limitations; tool entry.
- Cadence target: quarterly, aligned with the market refresh (D-09). A superseded study stays online with a "sustituido por" link (Constitution §6, stable URLs).

### R-21.5 Datasets

- Each study and each snapshot publishes `/mercado/datos/<snapshot-or-study>.csv`. Columns: geography fields, `measure`, `margin_kind`, `value`, `unit`, `period`, `as_of`, `source_id`, `source_url`, `confidence`. Values from `cite_only` sources are excluded; the page shows them as quoted, attributed figures instead.
- Licence of our own aggregates: from config `DATA_LICENSE_URL` (default CC BY 4.0, issue 005), shown on the page and in the CSV header comment.

### R-21.6 Dataset structured data

City pages and studies carry `Dataset` JSON-LD with `name`, `description`, `temporalCoverage`, `spatialCoverage` (`Place` with the municipality and province), `variableMeasured` (`PropertyValue` with `name`, `unitText`, `measurementTechnique` = the kind's definition), `isBasedOn` (source URLs), `license`, `creator` (`Organization`), `dateModified`, and `distribution` (`DataDownload`, `encodingFormat: text/csv`, `contentUrl`). Studies also carry `Article`. The R-20.6 visibility rule applies.

### R-21.7 Platform data (gate only)

Aggregates derived from user analyses may be published only after a later decision updates the privacy policy. Even then only as aggregates with ≥ 20 distinct properties per cell, never including counterpart signals or individual offers. Until then, no study reads from `analyses` or `properties`.

### R-21.8 Source pipeline

Before a new source is used in any published figure, it is added to `data/market/sources.csv` with `reuse` and `checked_at` (R-14.2). Candidate sources to evaluate are listed in `docs/market-sources.md`: Consejo General del Notariado statistical portal, Registradores, INE, Banco de España, Catastro, El País asking-vs-transaction comparison, Tecnocasa/UPF report.

### R-21.9 Charts

Inline SVG components as in spec 16, each followed by an equivalent data table (accessible and machine-readable).

## Acceptance criteria

- AC-21.1 With the seed snapshot, cities with a sourced city-level value get a page; a city with only inherited national values gets none and appears in the "sin datos locales" list.
- AC-21.2 A study rendered from snapshot S keeps its figures unchanged after importing snapshot S+1.
- AC-21.3 The CSV for a study excludes every row whose source is `cite_only`; the page still shows those figures with attribution.
- AC-21.4 Dataset JSON-LD validates (required fields present, `distribution.contentUrl` returns 200 `text/csv`) and every string appears on the page.
- AC-21.5 A test fixture mixing a `listing_cut` and an `asking_to_sale` value for one city renders two labelled rows and no combined figure.
- AC-21.6 Phase 2 exit: ≥ 1 city page and ≥ 1 study are published and listed in the sitemap and `llms.txt`.

## Files

`apps/web/src/pages/mercado/**`, `apps/web/src/content/estudios/**`, `apps/web/src/components/market/**`, `scripts/build-datasets.ts`, tests.
