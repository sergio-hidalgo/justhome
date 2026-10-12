# Spec 17 — Amendment A: seller wizard screens limited to 3 question groups

Status: accepted
Amends: spec 17 (R-17.1)
Depends on amendment: `specs/15-web-shell-routing-i18n-amendment.md` (SchemaForm `fields`)
Source: `issues/004-wizard-steps-exceed-three-questions.md` (option A and addendum)
Applies: implement together with spec 17, in its commit. Where this file and spec 17 disagree, this file wins.

## Requirements

### R-17.A1 Wizard steps (replaces the step table in R-17.1)

The "≤ 3 questions per moment" limit applies per screen of profiling questions about the user's position or the counterpart; property facts are exempt (issue 004). A *question group* is one question, or a tightly coupled set answered together (e.g. "monthly holding costs" with its typical-values toggle, or "worst/best range for each chosen issue"). Locked rows are not questions.

| step | screen                      | question groups                                                                        |
|------|-----------------------------|----------------------------------------------------------------------------------------|
| 1    | La vivienda                 | CCAA, municipality, asking price, listing date, price changes, appraisal (optional),   |
|      |                             | size m², catastral ref (hashed) — unchanged, exempt                                    |
| 2    | Mi situación                | situation (vivo allí y no he comprado / ya he comprado otra / necesito vender para     |
|      |                             | comprar / no es mi vivienda habitual); deadline date                                   |
| 3    | Mis costes y alternativa    | monthly holding costs (IBI, comunidad, seguro, hipoteca, second mortgage) as **one**   |
|      |                             | question with the "use typical values" toggle; best alternative (another offer amount, |
|      |                             | rent it out €/month, keep waiting); tax hints (reinvesting in a new habitual home      |
|      |                             | yes/no/unknown; purchase price and year, optional)                                     |
| 4    | Qué negocias                | choose issues; worst/best range for each chosen issue                                  |
| 5    | Límites y prioridades       | hard constraints; swing weights (preset profile cards may serve as a starting point    |
|      |                             | inside the weights question)                                                           |
| 6    | Primera oferta (optional)   | buyer label; package offered                                                           |
| 7    | El comprador: su vivienda   | renting?; lease ends soon?                                                             |
| 8    | El comprador: financiación  | pre-approval shown?; cash?; first-time buyer?                                          |

- Steps 7 and 8 are skipped when step 6 is skipped (no first offer). When step 6 is completed, every question in steps 7–8 accepts "No lo sé".
- The progress indicator counts the screens that apply (5 without a first offer, 8 with one). Back/Next, the `sessionStorage` draft and the submit flow are unchanged; the draft is keyed by schema field, not by screen.
- No requirement, route, API field or i18n key other than screen titles changes. `sellerPositionStep` (spec 02) is rendered across steps 2–3, `sellerPrioritiesStep` across steps 4–5 and `sellerOfferStep` across steps 6–8, using `<SchemaForm fields>`; each schema stays whole.

## Acceptance criteria

- AC-17.6 e2e: the seller wizard has 5 screens without a first offer and 8 with one; every screen of steps 2–8 contains at most 3 question groups.
- AC-17.7 e2e: submitting after completing the split wizard sends the same payload as the unsplit schemas describe (contract test against `sellerPositionStep`, `sellerPrioritiesStep` and `sellerOfferStep`).
- AC-17.8 e2e: skipping the first offer ends the wizard after step 5 and creates the property without a counterpart.

## Files

`apps/web/src/islands/seller/**`, tests (same as spec 17).
