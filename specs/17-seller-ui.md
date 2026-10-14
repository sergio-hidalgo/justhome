# Spec 17 — Seller UI (functional)

Status: todo
Phase: 2
Depends on: 11, 12, 13, 15, 16 (reuses components)

## Goal

A signed-in seller can describe their sale in a modal on `/vendedor`, get one free analysis, then subscribe; record offers from several buyers and see them ranked with a counter-package for each.

## Requirements

### R-17.1 Wizard modal (opened by "Analizar mi venta", after sign-in)

Rule (Constitution §2.3, issue 004): at most 3 question groups per screen of profiling questions about the user's position or the counterpart. Property facts are exempt. A _question group_ is one question, or a tightly coupled set answered together (e.g. "monthly holding costs" with its typical-values toggle, or "worst/best range for each chosen issue"). Locked rows are not questions.

| step | screen                     | question groups                                                                                                                                                                                                                                                                                                                                          |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | La vivienda                | CCAA, municipality, asking price, listing date, price changes, appraisal (optional), size m², catastral ref (hashed) — exempt                                                                                                                                                                                                                            |
| 2    | Mi situación               | situation (vivo allí y no he comprado / ya he comprado otra / necesito vender para comprar / no es mi vivienda habitual); deadline date                                                                                                                                                                                                                  |
| 3    | Mis costes y alternativa   | monthly holding costs (IBI, comunidad, seguro, hipoteca, second mortgage) as **one** question with the "use typical values" toggle; best alternative (another offer amount, rent it out €/month, keep waiting); tax hints (reinvesting in a new habitual home yes/no/unknown; purchase price and year, optional, for informational plusvalía/IRPF notes) |
| 4    | Qué negocias               | choose issues; worst/best range for each chosen issue                                                                                                                                                                                                                                                                                                    |
| 5    | Límites y prioridades      | hard constraints; swing weights (preset profile cards may serve as a starting point inside the weights question)                                                                                                                                                                                                                                         |
| 6    | Primera oferta (optional)  | buyer label; package offered                                                                                                                                                                                                                                                                                                                             |
| 7    | El comprador: su vivienda  | renting?; lease ends soon?                                                                                                                                                                                                                                                                                                                               |
| 8    | El comprador: financiación | pre-approval shown?; cash?; first-time buyer?                                                                                                                                                                                                                                                                                                            |

- Steps 7 and 8 are skipped when step 6 is skipped. When step 6 is completed, every question in steps 7–8 accepts "No lo sé".
- The progress indicator counts the screens that apply (5 without a first offer, 8 with one). Back/Next and a `sessionStorage` draft keyed by schema field.
- `sellerPositionStep` (spec 02) is rendered across steps 2–3, `sellerPrioritiesStep` across steps 4–5 and `sellerOfferStep` across steps 6–8, using `<SchemaForm fields>`; each schema stays whole.
- Deep-link prefill of property facts (R-15.12) fills step 1, after sign-in.

Submit → create property + optional counterpart → analyse.

### R-17.2 Free first analysis and paywall

- First analysis runs as `paid` tier output (D-05) and shows a banner "Análisis gratuito usado — suscríbete para actualizarlo".
- Any later action that triggers analysis, adding a 2nd buyer, or creating a 2nd property → `<UpgradeSheet reason="plan_required">` with Seller 5 (€19.95/mes) and Seller Plus (€39.95/mes).

### R-17.3 Seller dashboard `/vendedor/p/[id]`

Top: lights (on best current offer), nextAction, holding-cost clock ("Cada mes de espera te cuesta ~X €"), collapsible "Supuestos y límites" panel, and the same "¿Qué es?" methodology links as the buyer dashboard (R-16.3).

Tabs:

1. **Mi posición** — BATNA today / 1 / 3 / 6 months, decay €/month, tax notes (informational, with "consulta con un gestor").
2. **Ofertas y compradores** — ranking table: buyer label, latest offer (price + key terms), my utility, surplus €, estimated buyer reservation range, close probability, recommended response (accept / counter / hold / decline). Button "Registrar oferta" → `/vendedor/p/[id]/oferta` (modal).
3. **Acuerdo** — per buyer selector: recommended counter-package, scatter chart (same component as buyer), logrolling list.

### R-17.4 Offer modal `/vendedor/p/[id]/oferta`

Pick existing buyer or create "Comprador B/C…", enter package, log buyer signals (seller-role catalogue: pre-approval shown, cash, lease ending, number of visits, speed of offer, mentions other properties). Save → re-analyse → ranking updated with "what changed".

### R-17.5 Property list on `/vendedor`

Table: property, status, number of buyers, best offer, lights. Header: plan, active properties `n / limit`, link to billing portal.

## Acceptance criteria

- AC-17.1 e2e: new seller completes wizard, sees full dashboard and free-analysis banner.
- AC-17.2 e2e: adding a second buyer without a plan → UpgradeSheet; after test-mode subscription it succeeds.
- AC-17.3 Ranking orders 3 recorded offers by seller utility (mocked engine output).
- AC-17.4 Seller with lapsed subscription sees properties read-only, actions disabled with explanation.
- AC-17.5 Counterpart label defaults to "Comprador A/B/C…", is limited to 30 chars, and shows a privacy notice asking not to enter real names or contact details; no other counterpart free-text field exists.
- AC-17.6 e2e: the seller wizard has 5 screens without a first offer and 8 with one; every screen of steps 2–8 contains at most 3 question groups.
- AC-17.7 Contract test: submitting after completing the split wizard sends the same payload as `sellerPositionStep`, `sellerPrioritiesStep` and `sellerOfferStep` describe.
- AC-17.8 e2e: skipping the first offer ends the wizard after step 5 and creates the property without a counterpart.
- AC-17.9 e2e: `/vendedor?municipio=Valencia&precio=280000#nueva` without a session opens sign-in, then the wizard with those fields filled.

## Files

`apps/web/src/pages/vendedor/**`, `apps/web/src/islands/seller/**`, tests.
