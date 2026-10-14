# Spec 16 — Buyer UI (functional)

Status: todo
Phase: 1
Depends on: 11, 12, 13, 15

## Goal

A buyer can, from `/comprador`, describe a property in a modal wizard, see the analysis dashboard, log signals and offers over time, and manage several properties — free or paid.

## Requirements

### R-16.1 Wizard modal (opened by "Analizar una vivienda")

Rule (Constitution §2.3, issue 004): the "≤ 3 questions per moment" limit applies per screen of profiling questions about the user's position or the counterpart. Property facts are exempt. A _question group_ is one question, or a tightly coupled set answered together (e.g. "financing" = pre-approved + amount + cash %; "worst/best range for each chosen issue"). Locked rows are not questions.

Property facts (step 1):

| tier      | fields                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| free      | CCAA, municipality, asking price, days on market or listing date, price drops (count)    |
| paid adds | drop dates/amounts, size m², resale/new, listing URL, catastral ref (hashed client-side) |

Free tier — 4 screens:

| step | screen          | question groups                                                               |
| ---- | --------------- | ----------------------------------------------------------------------------- |
| 1    | La vivienda     | free property facts — exempt                                                  |
| 2    | Mi posición     | max budget; monthly rent; best alternative property (price, earliest closing) |
| 3    | Mis prioridades | preset profile (3 cards)                                                      |
| 4    | El vendedor     | habitual home?; empty / lived-in?; in a hurry? — each with "No lo sé"         |

Paid tier — 6 screens:

| step | screen                | question groups                                                                                                |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | La vivienda           | free + paid property facts — exempt                                                                            |
| 2    | Mi posición           | max budget; monthly rent; best alternative property (price, earliest closing)                                  |
| 3    | Plazo y financiación  | lease end date; financing (pre-approved, amount, cash %)                                                       |
| 4    | Qué negocias          | choose issues; worst/best range for each chosen issue                                                          |
| 5    | Límites y prioridades | hard constraints; swing weights (the 3 preset cards may serve as a starting point inside the weights question) |
| 6    | El vendedor           | habitual home?; empty / lived-in?; in a hurry? — each with "No lo sé"                                          |

- `buyerPositionStep` and `buyerPrioritiesStep` (spec 02) stay whole schemas; each is rendered across two screens with `<SchemaForm fields>` (R-15.5).
- The progress indicator counts the screens of the active tier. Back/Next; draft kept in `sessionStorage` until submit, keyed by schema field (not by screen), so buying a pack mid-wizard keeps the answers already given.
- Deep-link prefill of property facts (R-15.12) fills step 1.
- Submit → `POST /api/properties` + `POST …/counterparts` + `POST …/analyze` → navigate to `/comprador/p/[id]`.
- If the API answers `slot_limit` → `<UpgradeSheet>` with Pack 5.
- Free users see paid fields as visible-but-locked rows with a lock icon and "Disponible con Pack 5", at the end of screens 1, 2 and 3. They do not add screens.

### R-16.2 Property list (on `/comprador` and `/comprador/mis-viviendas`)

Table: property (municipality + asking price), status, last analysis date, traffic lights (3 dots), recommended action. Header shows slots `used / total` and the next pack expiry. Actions: open, archive (confirm: "archiving does not free the slot").

### R-16.3 Dashboard `/comprador/p/[id]`

Top: three lights + `nextAction` sentence + confidence chip + accuracy banner for free tier ("Precisión reducida: …") + collapsible "Supuestos y límites" panel (R-07.6, R-07.7).

The labels BATNA, ZOPA, precio de reserva, Nash and frontera de Pareto carry a small "¿Qué es?" link to `/metodologia/[termino]` (same tab, keyboard reachable). No other teaching content is added to the dashboard (principle 1).

Tabs:

1. **Mi posición** — BATNA today and at 1/3/6 months (small table), decay €/month, weights, trade-off rates in € (paid).
2. **El vendedor** — scenario A/B/C probabilities (horizontal bars), reservation price range p10–p50–p90 (range bar), decay range, signals logged with their effect (+/− on reservation), next signal to check with 2–3 suggested questions.
3. **Acuerdo** — recommended package card (each issue + value), surplus € and %, pie share bar; chart: scatter of packages (x = my utility, y = estimated seller utility) with BATNA lines, ZOPA shaded, frontier connected, Nash and KS marked (paid; free sees Nash card only); anchor and reservation cards; logrolling list "Cede en… / Pide…" (paid).

Charts are plain inline SVG components fed by engine output; no chart library.

### R-16.4 Extra info `/comprador/p/[id]/extra-info` (also as modal "Añadir información")

- Post-visit checklist (multi-select of catalogue codes for buyer role).
- Negotiation events (price drop with amount/date; mentions other offer with credibility slider; asked about your closing; hints urgency → follow-up reason picker).
- Offer exchanged: direction + package editor (same issue controls as wizard).
- After save → re-analyse, show "what changed" diff (reservation p50, lights, recommended package).
- Free tier: counter "2 de 3 señales usadas".

### R-16.5 Analysis history (paid)

List of snapshots with date, engine version, recommended package; click → read-only view of that snapshot.

## Acceptance criteria

- AC-16.1 e2e: anonymous user completes the wizard and sees a dashboard with lights, recommended package and the reduced-accuracy banner.
- AC-16.2 e2e: same user tries to add a 4th signal → UpgradeSheet.
- AC-16.3 e2e: paid user creates 2 properties, list shows `2 / 5`.
- AC-16.4 Logging `said_has_other_home` updates the scenario bars and shows a "what changed" diff.
- AC-16.5 All dashboard numbers come from the API response (snapshot test with a mocked API).
- AC-16.6 Dashboard usable at 360 px width without horizontal scroll.
- AC-16.7 e2e: the free wizard has 4 screens and every screen of steps 2–4 contains at most 3 question groups.
- AC-16.8 e2e: the paid wizard has 6 screens and every screen of steps 2–6 contains at most 3 question groups.
- AC-16.9 Contract test: the payload produced by the split paid wizard equals the one described by `buyerPropertyStep`, `buyerPositionStep`, `buyerPrioritiesStep` and `buyerSellerStep`.
- AC-16.10 Each of the five methodology terms in the dashboard links to its `/metodologia/[termino]` page, and the "Supuestos y límites" panel lists the output's assumptions and limitations.

## Files

`apps/web/src/pages/comprador/**`, `apps/web/src/islands/buyer/**`, `apps/web/src/components/charts/**`, tests.
