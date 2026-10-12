# Spec 16 — Amendment A: buyer wizard screens limited to 3 question groups

Status: accepted
Amends: spec 16 (R-16.1)
Depends on amendment: `specs/15-web-shell-routing-i18n-amendment.md` (SchemaForm `fields`)
Source: `issues/004-wizard-steps-exceed-three-questions.md` (option A and addendum)
Applies: implement together with spec 16, in its commit. Where this file and spec 16 disagree, this file wins.

## Requirements

### R-16.A1 Rule and definitions

The "≤ 3 questions per moment" limit applies per screen of profiling questions about the user's position or the counterpart; property facts are exempt (issue 004). A *question group* is one question, or a tightly coupled set answered together (e.g. "financing" = pre-approved + amount + cash %; "worst/best range for each chosen issue"). Locked rows (visible-but-locked, "Disponible con Pack 5") are not questions.

### R-16.A2 Screens (replace the step table in R-16.1)

Free tier — 4 screens:

| step | screen | question groups |
|---|---|---|
| 1 | La vivienda | free fields of spec 16 step 1 — exempt |
| 2 | Mi posición | max budget; monthly rent; best alternative property (price, earliest closing) |
| 3 | Mis prioridades | preset profile (3 cards) |
| 4 | El vendedor | habitual home?; empty / lived-in?; in a hurry? — each with "No lo sé" |

Paid tier — 6 screens:

| step | screen | question groups |
|---|---|---|
| 1 | La vivienda | free + paid fields of spec 16 step 1 — exempt |
| 2 | Mi posición | max budget; monthly rent; best alternative property (price, earliest closing) |
| 3 | Plazo y financiación | lease end date; financing (pre-approved, amount, cash %) |
| 4 | Qué negocias | choose issues; worst/best range for each chosen issue |
| 5 | Límites y prioridades | hard constraints; swing weights (the 3 preset cards may serve as a starting point inside the weights question) |
| 6 | El vendedor | habitual home?; empty / lived-in?; in a hurry? — each with "No lo sé" |

- Free users see the paid-only fields as locked rows at the end of screens 1, 2 and 3, as spec 16 already requires. They are not counted as questions and do not add screens.
- The progress indicator counts the screens of the active tier. Back/Next, the `sessionStorage` draft and the submit flow (`POST /api/properties` + `POST …/counterparts` + `POST …/analyze`) are unchanged.
- The draft is keyed by schema field, not by screen, so buying a pack mid-wizard keeps the answers already given.
- `buyerPositionStep` and `buyerPrioritiesStep` (spec 02) stay whole schemas; each is rendered across two screens with `<SchemaForm fields>`.

## Acceptance criteria

- AC-16.7 e2e: the free wizard has 4 screens and every screen of steps 2–4 contains at most 3 question groups.
- AC-16.8 e2e: the paid wizard has 6 screens and every screen of steps 2–6 contains at most 3 question groups.
- AC-16.9 Contract test: the payload produced by the split paid wizard equals the one described by `buyerPropertyStep`, `buyerPositionStep`, `buyerPrioritiesStep` and `buyerSellerStep`.

## Files

`apps/web/src/islands/buyer/**`, tests (same as spec 16).
