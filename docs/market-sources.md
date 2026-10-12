# Market reference sources

Seed file: `data/market/2026-10-12.csv` (imported by spec 14). Cadence: quarterly manual review (D-09).

| Input | Source | Period | Used for | Confidence | Next refresh |
|---|---|---|---|---|---|
| Negotiation gap by city | Fotocasa negotiation index ([article](https://www.bolsamania.com/noticias/economia/negociar-el-precio-de-la-vivienda-estas-son-las-ciudades-espanolas-con-mas-margen--22760416.html)) | H1 2026 | `negotiation_margin` (city) | medium | H2 2026 index (≈ Jan 2027) |
| National margin proxy | idealista price-cut study ([article](https://www.diaridetarragona.com/vivienda/271418/16-viviendas-venta-tarragona-rebaja-precio-inicial.html)): 16 % of listings cut, avg 28,280 € / 6 % | Q2 2026 | `negotiation_margin` (national fallback) | low (listing cut ≠ closing gap) | Q3 2026 study |
| Price-cut share | idealista ([Q1 article](https://www.idealista.com/news/inmobiliario/vivienda/2026/05/26/898937-el-14-de-los-anuncios-en-venta-rebajo-su-precio-durante-el-primer-trimestre)) — Q1 14 %, Q2 16 % | Q1–Q2 2026 | prior for "price drop" signal frequency | medium | quarterly |
| Time to sell | idealista ([article](https://www.bolsamania.com/noticias/empresas/economia--el-7-de-las-viviendas-vendidas-en-idealista-en-el-segundo-trimestre-estuvo-menos-de-una-semana-anunciada--23202747.html)) — <1 wk 7 %, 1 wk–1 m 19 %, 1–3 m 27 %, 3–12 m 36 %, >1 y 11 % | Q2 2026 | `horizon_months` = 3; DOM adjustment table | medium | quarterly |
| Holding costs | AEFI ([article](https://www.elespanol.com/sociedad/20261007/expertos-pisos-coinciden-mantener-vivienda-vacia-espana-cuesta-euros-ano/1003744388074_0.html)) — 5,000 €/yr empty home, 100k € cadastral value | Oct 2026 | `holding_A` = 183 €/m (IBI + comunidad + seguro), `holding_B` = 417 €/m + mortgage | medium | yearly |
| IBI empty-home surcharge | same AEFI article (up to +50 % / +100 % / +50 % per municipal ordinance) | 2026 | informational note in seller tax panel | medium | yearly |
| ITP by CCAA | [Gibobs](https://www.gibobs.com/blog/itp-2026/), cross-check [cuantomecuesta](https://cuantomecuesta.com/es/impuesto-transmisiones/) | 2026 | `itp_rate` (euro value of "seller assumes ITP") | medium; **low where sources disagree** (CLM, Galicia, Cataluña brackets, Baleares, País Vasco) | verify against each regional tax agency before launch |
| Rent €/m² | idealista via [que.es](https://www.que.es/2026/09/01/precio-alquiler-agosto-2026/) — Spain 15.1; Madrid 23.3; Barcelona 20.2; Palma 19.3; Jaén, Cáceres 8.3 | Aug 2026 | buyer wait-cost estimate (seller view) | medium | monthly/quarterly |
| IRPF reinvestment exemption | [AEAT manual](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c11-ganancias-perdidas-patrimoniales/ganancias-excluidas-gravamen-supuestos-reinversion/transmision-vivienda-habitual-reinversion-importe/exencion.html) — reinvest within 2 years | law | seller scenario priors (low urgency while searching) | high | on legal change |

## Gaps still open

- No published negotiation gap for Madrid, Barcelona, Sevilla, Bilbao, Zaragoza → national fallback (low confidence). Candidate sources: Fotocasa full index tables, notarial closing prices (Consejo General del Notariado) vs portal asking prices.
- Scenario C (needs to sell to buy) wait cost has no published figure → model range 400–800 €/month is carried in the national row of the seed CSV as `ASSUMPTION(holding_C)` with `confidence = low` (issue 002). Replace it when a source is found.
- DOM adjustment table (spec 05 R-05.1.2) is a modelling assumption; calibrate against the time-to-sell distribution above once real app data exists.

## Corrections vs the DeepSeek notes

| Notes claimed | Published figure |
|---|---|
| National margin 15 %; Granada +35 %, Cáceres +33 %, Toledo +32 %, Madrid +11 %, San Sebastián +1.8 % | Fotocasa H1 2026: Granada 9 %, Palma 16 % (highest), San Sebastián 1 %; no Madrid or national figure; idealista avg listing cut 6 % |
| Empty-home cost ≈ 5,000 €/yr (AEFI) | Confirmed (AEFI, Oct 2026) |
| Madrid ITP 6 % → 19,200 € on 320k | Confirmed |
