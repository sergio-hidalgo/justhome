# Spec 05 — Engine: counterpart estimation (Bayesian + Monte Carlo)

Status: todo
Phase: 0
Depends on: 03, 04

## Goal

Estimate the other side's reservation value, BATNA and weights as a probability distribution, updated by every logged signal, with a range and a confidence level.

## Requirements

### R-05.0 Where the numbers come from

- Margins, holding-cost / decay ranges, `H` (months to next comparable offer) and rent come from `input.market`. The estimation modules contain no market literal.
- The tables in R-05.1.3 (scenario priors) and R-05.1.6 (Dirichlet presets, κ rule), `band` = 0.03, buyer `headroom` ~ Triangular(0, 0.03, 0.08), default `draws` (1,000 / free 300) and the scenario status-quo closing levels (R-05.1.5) are model parameters: constants in `packages/engine/src/params.ts`, each with a comment citing the requirement. Changing one is an engine change (`ENGINE_VERSION` bump + CHANGELOG, R-08.4).
- Likelihoods, shifts and nudges come from `input.catalog` (R-02.8), not from a constant and not from the database.

### R-05.1 Seller as counterpart (buyer view)

1.**Expected closing price** `V = asking × (1 − margin)`, where `margin ~ Triangular(m − band, m, m + band)` from `market_reference` for the city (fallback: province, then national). `band` default 0.03.
2.**Time-on-market adjustment** to the margin mode (configurable table in `market_reference.dom_adjustments`):

| days on market | price drops                    | margin adjustment |
| -------------- | ------------------------------ | ----------------- |
| 0–30           | 0                              | −0.02             |
| 30–60          | 0                              | 0                 |
| 60–90          | 0                              | +0.01             |
| 60–90          | 1                              | +0.03             |
| >90            | ≥2                             | +0.05             |
| any            | drop within 10 days of listing | +0.04             |

3.**Scenario prior** P(A), P(B), P(C) from quick answers:

| habitual home | empty / lived-in | seems in a hurry | prior A / B / C    |
| ------------- | ---------------- | ---------------- | ------------------ |
| yes           | lived-in         | no               | 0.70 / 0.05 / 0.25 |
| yes           | empty            | yes              | 0.10 / 0.75 / 0.15 |
| yes           | lived-in         | yes              | 0.25 / 0.15 / 0.60 |
| unknown       | unknown          | unknown          | 0.40 / 0.25 / 0.35 |

Rows not listed: start from the `unknown` row and apply each known answer as a signal.

4.**Reservation price per draw** `R = V − decay_s × H` where `decay_s ~ Uniform(range of scenario s)` (spec 04 table) and `H` = expected months to next comparable offer (default 3, from `market_reference`).
5.**Counterpart BATNA utility per draw** = `U_other(pkg_R)` where `pkg_R` = price R + the counterpart's status-quo levels for other issues (scenario defaults: A prefers long closing, B short closing, C closing aligned to their purchase).
6.**Counterpart weights per draw** ~ Dirichlet(κ · preset_s), κ = 20 (less certain) rising by +5 per relevant signal up to 60. Presets per scenario:

| scenario | price | closingDays | costs | others (shared)           |
| -------- | ----- | ----------- | ----- | ------------------------- |
| A        | 0.60  | 0.15        | 0.15  | 0.10                      |
| B        | 0.45  | 0.35        | 0.10  | 0.10                      |
| C        | 0.45  | 0.25        | 0.10  | 0.20 (rentBackDays first) |

### R-05.2 Buyer as counterpart (seller view)

Same machinery with buyer scenarios `renting_flexible`, `renting_deadline`, `owner_chain`, `cash_investor`:

- `V` = buyer's apparent max = offered price × (1 + headroom), headroom ~ Triangular(0, 0.03, 0.08).
- Decay = buyer's monthly rent (estimated from `market_reference.rent_per_m2` × m² when given, else range).
- Financing certainty (cash, pre-approval shown) changes **probability of closing**, not BATNA; reported separately as `closeProbability`.

### R-05.3 Signals and Bayesian update

- Signals are read from `input.catalog` (`SignalCatalogEntry`, R-02.8).
- Posterior `P(s | signals) ∝ P(s) · Π L(signal | s)`.
- `batnaShift` (e.g. "mentions another offer" +2 % × credibility) moves V upward; credibility default 0.5, user-adjustable.
- `weightNudge` adds to the Dirichlet mode before renormalising (e.g. "insists on closing date" → closingDays +0.10).

Seed catalogue (initial calibration, to be tuned with real data). It lives in `packages/engine/test/catalog.fixture.ts` as `SignalCatalogEntry[]`, used by tests, and `supabase/seed.sql` must contain exactly the same rows (R-09.6):

| code                             | label (ES)                           | L(A) | L(B) | L(C) | extra                         |
| -------------------------------- | ------------------------------------ | ---- | ---- | ---- | ----------------------------- |
| visit_furnished                  | Amueblada, vive allí                 | 0.85 | 0.10 | 0.70 |                               |
| visit_empty                      | Completamente vacía                  | 0.10 | 0.85 | 0.25 |                               |
| visit_boxes                      | Cajas / mudanza en curso             | 0.10 | 0.70 | 0.50 |                               |
| said_has_other_home              | "Ya tiene otra casa"                 | 0.05 | 0.90 | 0.20 |                               |
| said_looking_nearby              | "Busca algo por la zona"             | 0.50 | 0.05 | 0.80 |                               |
| seemed_hurried                   | Nervioso / con prisa                 | 0.20 | 0.60 | 0.50 |                               |
| price_drop                       | Ha bajado el precio                  | 0.30 | 0.60 | 0.50 | margin +0.02 per drop         |
| mentions_other_offer             | Menciona otra oferta                 | 0.40 | 0.40 | 0.40 | batnaShift +2 %, cred 0.5     |
| asked_your_closing               | Pregunta por tu plazo                | 0.30 | 0.60 | 0.70 | weightNudge closingDays +0.10 |
| hurry_reason_move_job            | Prisa: mudanza / trabajo             | 0.20 | 0.50 | 0.50 |                               |
| hurry_reason_buying              | Prisa: compra de otra casa           | 0.05 | 0.60 | 0.80 |                               |
| hurry_reason_inheritance_divorce | Prisa: herencia / divorcio           | 0.20 | 0.50 | 0.30 |                               |
| rejects_close_offer              | Rechaza ofertas cercanas a su precio | 0.70 | 0.20 | 0.40 | margin −0.02                  |

### R-05.4 Monte Carlo

- `draws` default 1,000 (free tier 300). PRNG seeded from `inputsHash`.
- Output:

```ts
interface CounterpartEstimate {
  scenarioPosterior: Record<string, number>;
  reservation: { p10: number; p50: number; p90: number }; // €
  batnaPoints: { p10: number; p50: number; p90: number };
  decayPerMonth: { low: number; high: number }; // €
  weightsMedian: Partial<Record<IssueKey, number>>;
  confidence: 'low' | 'medium' | 'high';
  closeProbability?: number; // buyer counterparts
  draws: DrawSample[]; // kept in memory for spec 06, not persisted
}
```

### R-05.5 Confidence

`width = (p90 − p10) / p50` of reservation. high if width < 0.03 and ≥ 3 signals; medium if width < 0.07; else low. Free tier: always `low`.

Then the confidence is lowered by one level **for each** of these conditions, read from the provenance in `input.market` (spec 14):

1. the negotiation margin was supplied by a row with `confidence = low`;
2. the margin is older than 12 months;
3. the holding-cost range used for the scenario with the highest posterior probability has `assumed = true`.

The reductions stack and the result is floored at `low`.

### R-05.6 Next signal to check

For each catalogue signal not yet logged and applicable to the role, compute expected entropy reduction of the scenario posterior; return the top 1 with 2–3 suggested natural questions (i18n keys from the catalogue).

## Acceptance criteria

- AC-05.1 Same input ⇒ identical estimate (determinism).
- AC-05.2 Prior "unknown" + signals `visit_empty` + `said_has_other_home` ⇒ P(B) > 0.85.
- AC-05.3 Prior A-row + `said_looking_nearby` keeps argmax = A or C, never B.
- AC-05.4 Adding `mentions_other_offer` raises reservation p50.
- AC-05.5 Madrid fixture (`fixtures/estimate-madrid.json`: asking 340k, margin 0.11, band 0, DOM adjustments zeroed, scenario A certain with decay range [150,150], H = 3) ⇒ reservation p50 = 302,150 € ± 1; same with scenario B and range [1000,1000] ⇒ 299,600 € ± 1.
- AC-05.6 Free tier output confidence is `low` regardless of width.
- AC-05.7 Posterior sums to 1 ± 1e-9.
- AC-05.8 Changing one likelihood in `catalog` changes `inputsHash`.
- AC-05.9 Estimation modules contain no market literal: a test passes a market object and asserts that margins, holding-cost ranges and rent follow it.
- AC-05.10 With scenario C as the modal posterior and an assumed range, confidence is one level lower than with a sourced range; with conditions 1 and 3 both true it is two levels lower; it never goes below `low`.

## Files

`packages/engine/src/estimate/{seller.ts,buyer.ts,bayes.ts,montecarlo.ts,entropy.ts,dirichlet.ts,confidence.ts}`, `rng.ts`, `params.ts`, `packages/engine/test/catalog.fixture.ts`, tests.
