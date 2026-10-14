# Spec 18 — Export (PDF / CSV)

Status: todo
Phase: 2
Depends on: 11, 12, 16

## Goal

Paid users download a negotiation brief (PDF) and the package table (CSV) for one property.

## Requirements

R-18.1 `GET /api/properties/:id/export?format=pdf|csv&analysisId=` (paid buyers, active sellers; behind `FLAG_EXPORT`).
R-18.2 PDF (server-rendered HTML → PDF with Playwright Chromium in the API container), in the user's locale, 2–3 pages: summary lights and next action; recommended package and anchor/reservation; counterpart estimate with range and confidence; frontier table; logrolling; assumptions and limitations (R-07.6, R-07.7); disclaimer; engine version and market provenance with dates and measure kind. Text resolves through `packages/i18n` `renderExplain` (R-07.8).
R-18.3 CSV: one row per enumerated package in the ZOPA: issue levels, uMe, uOtherEstimated, sMe, acceptProb, onFrontier, isNash.
R-18.4 Exports never include other properties, user email or counterpart free text.

## Acceptance criteria

- AC-18.1 Free user → 402 `tier_limit`.
- AC-18.2 PDF for the freelance-like fixture contains the Nash package values.
- AC-18.3 CSV row count equals ZOPA size.
- AC-18.4 EN locale produces English PDF headings.

## Files

`apps/api/src/routes/export.ts`, `apps/api/src/export/{pdf.ts,csv.ts,templates/}`, tests.
