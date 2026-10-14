# Spec 15 — Web shell, routing and i18n (ES/EN)

Status: todo
Phase: 1
Depends on: 01, 07, 10

## Goal

A plain, accessible, fully navigable Astro app with every route in place, a shared layout, modal infrastructure and two languages: the skeleton that the buyer and seller UIs (16, 17) and the public knowledge layer (20, 21) fill in. Public routes are crawlable and readable without JavaScript. Marketing-grade design comes later and must only touch styles and landing content.

## Requirements

### R-15.1 Routes

App routes (D-12: forms open as modals inside the role routes):

| route                          | access       | content                                                                                                                                                                               |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                            | public       | Positioning statement (R-15.10), two buttons "Voy a comprar" → `/comprador`, "Voy a vender" → `/vendedor`, links to Guías, Mercado, Metodología                                       |
| `/comprador`                   | public       | Short explainer + "Qué decide esta herramienta" list + "Analizar una vivienda" button → **modal wizard** (spec 16) + links to buyer guides; below, the user's buyer properties if any |
| `/comprador/mis-viviendas`     | paid buyer   | List + slots used/available + pack expiry                                                                                                                                             |
| `/comprador/p/[id]`            | owner        | Dashboard (spec 16)                                                                                                                                                                   |
| `/comprador/p/[id]/extra-info` | owner        | Log visit/negotiation signals and offers (also openable as modal from the dashboard)                                                                                                  |
| `/vendedor`                    | public       | Explainer + "Qué decide esta herramienta" list + "Analizar mi venta" button → sign-in if needed → **modal wizard** (spec 17) + links to seller guides; list of seller properties      |
| `/vendedor/p/[id]`             | owner        | Seller dashboard (spec 17)                                                                                                                                                            |
| `/vendedor/p/[id]/oferta`      | owner        | Record an offer and buyer signals (also modal from dashboard)                                                                                                                         |
| `/precios`                     | public       | Plans from `/api/me/entitlements` + Stripe prices                                                                                                                                     |
| `/cuenta`                      | signed in    | Entitlements, billing portal link, language, joint-mode consent                                                                                                                       |
| `/auth/*`                      | public       | Sign-in, callback, sign-out                                                                                                                                                           |
| `/mesa/[sessionId]`            | both parties | Joint session (spec 19, behind `FLAG_JOINT_MODE`)                                                                                                                                     |
| `/terminos`, `/privacidad`     | public       | Terms of use (incl. no automated access, R-10.8) and privacy policy                                                                                                                   |

Public knowledge routes (stubs here; content in specs 20 and 21):

| route                                                                                    | content (spec)                                                      |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `/guias`, `/guias/comprar/[slug]`, `/guias/vender/[slug]`                                | Decision-intent guides (20)                                         |
| `/mercado`, `/mercado/[ciudad]`, `/mercado/estudios/[slug]`, `/mercado/datos/[file].csv` | Market intelligence (21)                                            |
| `/metodologia`, `/metodologia/[termino]`                                                 | Method, glossary, worked examples (20)                              |
| `/acerca`                                                                                | Who we are, what we are and are not, editorial and data policy (20) |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `<public path>.md`                           | Generated machine-readable files (20)                               |

English aliases 301 → Spanish routes: `/buyer`, `/seller`, `/pricing`, `/account`, `/guides`, `/market`, `/methodology`, `/about`, `/terms`, `/privacy`.

### R-15.2 i18n

Astro i18n with `es` default (no prefix) and `en` under `/en/...` (same slugs). The language switcher in the header persists to `profiles.locale`.

- UI copy comes from `src/i18n/{es,en}.json`.
- Engine explanation keys resolve through `packages/i18n` `renderExplain` (R-07.8).
- Long-form public content lives in content collections per locale (spec 20).
- Number, currency and date formatting via `Intl` with the active locale.

### R-15.3 Layout

- Header: logo text, role links, language, account/sign-in.
- Main.
- Footer: links to Guías, Mercado, Metodología, Acerca, Términos, Privacidad, and the disclaimer "Herramienta de apoyo a la decisión; no es una tasación, ni intermediación inmobiliaria, ni asesoramiento legal, fiscal, financiero o hipotecario" (EN equivalent).

### R-15.4 Modal infrastructure

`<Modal>` island over native `<dialog>`: focus trap; Esc closes with a "discard changes?" confirmation; URL hash `#nueva` opens the wizard so it is linkable; full-screen on mobile.

### R-15.5 Form engine

Island `<SchemaForm schema step tier fields?>` renders any step schema from spec 02: number (with € or unit suffix), select, radio chips (tap targets ≥ 44 px), checkbox list, date, range-pair (worst/best), weights (sliders that always sum to 100), and an "I don't know" option on enums. Zod validation messages are mapped to i18n keys.

`fields` (optional) lists keys of the step schema:

- When given, only those fields are rendered, and validation on leaving the screen covers only them.
- Values of fields not rendered are preserved untouched in the value object passed in and out.
- The full step schema is still validated at submit time by the caller.

This lets one step schema render across several screens (specs 16 and 17).

### R-15.6 Data fetching

SSR pages call the API with the user's token (cookie → bearer). Islands use a small `api.ts` client with typed responses from `packages/schemas`.

### R-15.7 Styling

One `base.css`: system font stack, CSS variables for colours and spacing, light/dark via `prefers-color-scheme`. No UI kit. All tokens in variables so the later redesign can replace them.

### R-15.8 Accessibility

WCAG 2.2 AA on all v1 screens (labels, contrast, keyboard paths). Axe check in Playwright.

### R-15.9 Upgrade sheet

`<UpgradeSheet reason>` is shown whenever the API returns `slot_limit`, `tier_limit`, `plan_required` or `account_required`. It shows the relevant plan and a checkout button.

### R-15.10 Positioning on `/`

Above the two role buttons: the positioning statement (Constitution §1) as one `<h1>` and one paragraph from i18n. This is functional UI, not marketing design (principle 7).

### R-15.11 Rendering and head metadata (principle 9)

- `/`, `/comprador`, `/vendedor`, `/precios`, `/acerca`, `/terminos`, `/privacidad` and every knowledge route render their full text server-side and are readable with JavaScript disabled. Knowledge routes are prerendered (`export const prerender = true`). Islands only add interaction.
- Semantic structure: one `<h1>`, content in `<main>` → `<article>` on content pages, headings in order.
- A single `<SeoHead>` component on every route renders: `<title>`, meta description, canonical on `PUBLIC_SITE_URL`, `hreflang` es/en/x-default (when a translation exists), Open Graph, and JSON-LD from a `structuredData` prop (types and rules in spec 20).
- Private routes (`/comprador/mis-viviendas`, `/comprador/p/*`, `/vendedor/p/*`, `/cuenta`, `/auth/*`, `/mesa/*`) render `noindex, nofollow` and no JSON-LD.
- `PUBLIC_SITE_URL` and `SITE_NAME` are added to `apps/web/.env.example` and the env schema.

### R-15.12 Deep-link prefill (D-14)

`/comprador` and `/vendedor` accept prefill query parameters for **property facts only**: `ccaa`, `municipio`, `precio` (euros, integer), `dias` (days on market).

- With `#nueva`, the wizard opens with those fields filled and editable. Invalid values are ignored silently. Any other parameter is ignored.
- Prefilled data is never submitted automatically; the user goes through every screen. Seller deep links go through sign-in first (R-10.4).
- These links are what guides, market pages and `llms.txt` point to (spec 20).

## Acceptance criteria

- AC-15.1 Every route renders (200 or redirect to sign-in) in both languages where a translation exists.
- AC-15.2 `/buyer` → 301 `/comprador`; `/guides` → 301 `/guias`; `/en/comprador` renders English copy.
- AC-15.3 Opening `/comprador#nueva` opens the wizard modal; Esc asks to discard.
- AC-15.4 Weight sliders always total 100.
- AC-15.5 Axe reports no serious violations on `/`, `/comprador`, `/vendedor`, `/precios`.
- AC-15.6 No hard-coded user-facing strings in components, islands and layouts (lint rule; `src/content/**` is exempt).
- AC-15.7 Rendering `<SchemaForm>` with `fields` shows only those fields and validates only them.
- AC-15.8 Values of non-rendered fields are present and unchanged in the emitted value.
- AC-15.9 Playwright with JavaScript disabled: `/`, `/comprador` and `/vendedor` show their `<h1>` and full body text.
- AC-15.10 Every private route returns `noindex` and no JSON-LD; every public route has exactly one canonical link on `PUBLIC_SITE_URL`.
- AC-15.11 `/comprador?ccaa=Comunidad%20de%20Madrid&municipio=Madrid&precio=340000#nueva` opens the wizard with those three fields filled; an extra `maxBudget=1` parameter is ignored.

## Files

`apps/web/src/{layouts,pages,islands,components,i18n,lib,styles}/**` (incl. `components/SeoHead.astro`), Playwright tests.
