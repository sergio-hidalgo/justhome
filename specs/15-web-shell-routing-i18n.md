# Spec 15 — Web shell, routing and i18n (ES/EN)

Status: todo
Phase: 1
Depends on: 01, 10

## Goal

A plain, accessible, fully navigable Astro app with every route in place, shared layout, modal infrastructure and two languages — the skeleton the buyer and seller UIs fill in. Marketing-grade design comes later and must only touch styles and landing content.

## Requirements

R-15.1 Routes (D-12: forms open as modals inside the role routes):

| route | access | content |
|---|---|---|
| `/` | public | Two buttons: "Voy a comprar" → `/comprador`, "Voy a vender" → `/vendedor` |
| `/comprador` | public | Short explainer + "Analizar una vivienda" button → **modal wizard** (spec 16); below, the user's buyer properties if any |
| `/comprador/mis-viviendas` | paid buyer | List + slots used/available + pack expiry |
| `/comprador/p/[id]` | owner | Dashboard (spec 16) |
| `/comprador/p/[id]/extra-info` | owner | Log visit/negotiation signals and offers (also openable as modal from the dashboard) |
| `/vendedor` | public | Explainer + "Analizar mi venta" button → sign-in if needed → **modal wizard** (spec 17); list of seller properties |
| `/vendedor/p/[id]` | owner | Seller dashboard (spec 17) |
| `/vendedor/p/[id]/oferta` | owner | Record an offer and buyer signals (also modal from dashboard) |
| `/precios` | public | Plans from `/api/me/entitlements` + Stripe prices |
| `/cuenta` | signed in | Entitlements, billing portal link, language, joint-mode consent |
| `/auth/*` | public | Sign-in, callback, sign-out |
| `/mesa/[sessionId]` | both parties | Joint session (spec 19, behind `FLAG_JOINT_MODE`) |

English aliases 301 → Spanish routes: `/buyer`, `/seller`, `/pricing`, `/account`.

R-15.2 i18n: Astro i18n with `es` default (no prefix) and `en` under `/en/...` (same slugs). Language switcher in header persists to `profiles.locale`. All copy from `src/i18n/{es,en}.json`; engine explanation keys resolve here. Number/currency/date formatting via `Intl` with the active locale.

R-15.3 Layout: header (logo text, role links, language, account/sign-in), main, footer (legal links, disclaimer "Herramienta de apoyo a la decisión; no es asesoramiento legal, fiscal ni financiero").

R-15.4 Modal infrastructure: `<Modal>` island over native `<dialog>`; focus trap, Esc closes with "discard changes?" confirmation, URL hash `#nueva` opens the wizard so it is linkable; on mobile it is full-screen.

R-15.5 Form engine island `<SchemaForm schema step tier>` renders any step schema from spec 02: number (with € or unit suffix), select, radio chips (tap targets ≥ 44 px), checkbox list, date, range-pair (worst/best), weights (sliders that always sum to 100), and an "I don't know" option on enums. Validation messages from zod mapped to i18n keys.

R-15.6 Data fetching: SSR pages call the API with the user's token (cookie → bearer); islands use a small `api.ts` client with typed responses from `packages/schemas`.

R-15.7 Styling: one `base.css` (system font stack, CSS variables for colors and spacing, light/dark via `prefers-color-scheme`). No UI kit. All tokens in variables so the later redesign can replace them.

R-15.8 Accessibility: WCAG 2.2 AA on all v1 screens (labels, contrast, keyboard paths). Axe check in Playwright.

R-15.9 Upgrade sheet component `<UpgradeSheet reason>` shown whenever the API returns `slot_limit`, `tier_limit`, `plan_required`, `account_required`; it shows the relevant plan and a checkout button.

## Acceptance criteria

- AC-15.1 Every route renders (200 or redirect to sign-in) in both languages.
- AC-15.2 `/buyer` → 301 `/comprador`; `/en/comprador` renders English copy.
- AC-15.3 Opening `/comprador#nueva` opens the wizard modal; Esc asks to discard.
- AC-15.4 Weight sliders always total 100.
- AC-15.5 Axe reports no serious violations on `/`, `/comprador`, `/vendedor`, `/precios`.
- AC-15.6 No hard-coded user-facing strings (lint rule).

## Files

`apps/web/src/{layouts,pages,islands,i18n,lib,styles}/**`, Playwright tests.
