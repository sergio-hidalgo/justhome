# Spec 17 — Seller UI (functional)

Status: todo
Phase: 2
Depends on: 11, 12, 13, 15, 16 (reuses components)

## Goal

A signed-in seller can describe their sale in a modal on `/vendedor`, get one free analysis, then subscribe; record offers from several buyers and see them ranked with a counter-package for each.

## Requirements

### R-17.1 Wizard modal (opened by "Analizar mi venta", after sign-in)

| step | fields |
|---|---|
| 1 La vivienda | CCAA, municipality, asking price, listing date, price changes, appraisal (optional), size m², catastral ref (hashed) |
| 2 Mi posición | situation (vivo allí y no he comprado / ya he comprado otra / necesito vender para comprar / no es mi vivienda habitual); monthly holding costs (IBI, comunidad, seguro, hipoteca, second mortgage) with "use typical values" toggle; deadline date; best alternative (another offer amount, rent it out €/month, keep waiting); tax hints: reinvesting in a new habitual home (yes/no/unknown), purchase price and year (optional, for informational plusvalía/IRPF notes) |
| 3 Mis prioridades | issues, worst/best, hard constraints, swing weights |
| 4 Primera oferta (optional) | buyer label, package offered, quick buyer answers (renting? lease ends soon? pre-approval shown? cash? first-time buyer?) |

Submit → create property + optional counterpart → analyse.

### R-17.2 Free first analysis and paywall

- First analysis runs as `paid` tier output (D-05) and shows a banner "Análisis gratuito usado — suscríbete para actualizarlo".
- Any later action that triggers analysis, adding a 2nd buyer, or creating a 2nd property → `<UpgradeSheet reason="plan_required">` with Seller 5 (€19.95/mes) and Seller Plus (€39.95/mes).

### R-17.3 Seller dashboard `/vendedor/p/[id]`

Top: lights (on best current offer), nextAction, holding-cost clock ("Cada mes de espera te cuesta ~X €").

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

## Files

`apps/web/src/pages/vendedor/**`, `apps/web/src/islands/seller/**`, tests.
