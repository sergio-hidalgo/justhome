# Spec 16 — Buyer UI (functional)

Status: todo
Phase: 1
Depends on: 11, 12, 13, 15

## Goal

A buyer can, from `/comprador`, describe a property in a modal wizard, see the analysis dashboard, log signals and offers over time, and manage several properties — free or paid.

## Requirements

### R-16.1 Wizard modal (opened by "Analizar una vivienda")

| step | free fields | paid adds |
|---|---|---|
| 1 La vivienda | CCAA, municipality, asking price, days on market or listing date, price drops (count) | drop dates/amounts, size m², resale/new, listing URL, catastral ref (hashed client-side) |
| 2 Mi posición | max budget, monthly rent, best alternative property (price, earliest closing) | lease end date, financing (pre-approved, amount, cash %) |
| 3 Mis prioridades | preset profile (3 cards) | choose issues, worst/best per issue, hard constraints, swing weights |
| 4 El vendedor | habitual home? empty/lived-in? in a hurry? (each with "No lo sé") | — |

- Progress indicator, Back/Next, draft kept in `sessionStorage` until submit.
- Submit → `POST /api/properties` + `POST …/counterparts` + `POST …/analyze` → navigate to `/comprador/p/[id]`.
- If the API answers `slot_limit` → `<UpgradeSheet>` with Pack 5.
- Free users see paid fields as visible-but-locked rows with a lock icon and "Disponible con Pack 5".

### R-16.2 Property list (on `/comprador` and `/comprador/mis-viviendas`)

Table: property (municipality + asking price), status, last analysis date, traffic lights (3 dots), recommended action. Header shows slots `used / total` and the next pack expiry. Actions: open, archive (confirm: "archiving does not free the slot").

### R-16.3 Dashboard `/comprador/p/[id]`

Top: three lights + `nextAction` sentence + confidence chip + accuracy banner for free tier ("Precisión reducida: …").

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

## Files

`apps/web/src/pages/comprador/**`, `apps/web/src/islands/buyer/**`, `apps/web/src/components/charts/**`, tests.
