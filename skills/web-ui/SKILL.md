---
name: web-ui
description: Callable skill — conventions for apps/web (Astro SSR + Preact islands): i18n keys, native dialog modals, SchemaForm, base.css variables, accessibility, tier gating, charts and routes. Invoke before writing or changing any page, island, component, style or i18n file under apps/web (specs 10, 15, 16, 17, 18, 19).
---

# Web UI

v1 UI is **functional, accessible and complete** — not designed
(Constitution §2.7). A later visual redesign must only touch styles and
landing content, so nothing here may bake in presentation decisions.

## Structure

- Astro pages are server-rendered; they call the API with the user's token
  (cookie → bearer). Preact islands only where client state is needed. Static
  markup stays `.astro`.
- Islands fetch through `src/lib/api.ts`, with response types from
  `packages/schemas`. The browser Supabase client (`src/lib/supabase.ts`) is for
  **auth only**; domain data always goes through the API.
- Only `PUBLIC_*` variables exist in the browser. No service-role key, no
  Stripe secret, ever.
- Routes are Spanish slugs; `/buyer`, `/seller`, `/pricing`, `/account` are 301
  aliases; English UI lives under `/en/...` with the same slugs.

## Copy and formatting

- All user-facing text comes from `src/i18n/{es,en}.json` via keys. The same
  key set must exist in both files. Engine explanation keys
  (`{ key, params }`) resolve here. No inline strings (AC-15.6 lint rule).
- Counterpart-derived figures use keys containing `.estimated` and show range +
  confidence ("estimado").
- Format with `Intl.NumberFormat`/`Intl.DateTimeFormat` in the active locale.
  Cents are converted to euros for display in one helper; no arithmetic on
  engine numbers in UI (AC-16.5).
- Prices of Pack 5 / Seller 5 / Seller Plus come from the API
  (`/api/me/entitlements` + Stripe), not literals.
- Footer carries the decision-support disclaimer from an i18n key.

## Modals and forms

- `<Modal>` island over native `<dialog>`: focus trap, Esc → "discard
  changes?" confirmation, `#nueva` opens the buyer wizard so it is linkable,
  full-screen on mobile (R-15.4). Property/position entry is always a modal
  inside `/comprador` / `/vendedor` (D-12).
- `<SchemaForm schema step tier>` renders every step from the
  `packages/schemas` schema; zod messages map to i18n keys. Weight sliders
  always sum to 100. Every enum offers "No lo sé / I don't know". Tap targets
  ≥ 44 px. Wizard drafts live in `sessionStorage` until submit.
- Counterpart label: default "Comprador A/B/C…", max 30 chars, with a privacy
  notice; no other counterpart free-text field.

## Gating

- Locked free-tier features render as visible-but-locked rows with a lock icon
  and the upgrade copy; paid values are absent from the payload (`locked: true`).
- `<UpgradeSheet reason>` appears for `slot_limit`, `tier_limit`,
  `plan_required`, `account_required`. Handle these in one place, not per
  island.
- Disable read-only properties' actions with an explanation (AC-17.4).

## Styling

- One `src/styles/base.css`: system font stack, CSS variables for colour and
  spacing, light/dark via `prefers-color-scheme`. No UI kit, no literal
  colours/spacing outside the variables.
- Charts are plain inline SVG components fed by engine output; no chart library.
  Colour is never the only carrier of meaning (traffic lights also have text).

## Accessibility and responsiveness

- WCAG 2.2 AA: labelled controls, contrast, visible focus, full keyboard path.
- Axe check in Playwright on `/`, `/comprador`, `/vendedor`, `/precios`
  (AC-15.5). Dashboards usable at 360 px with no horizontal scroll
  (AC-16.6).

## Before you commit

- [ ] No hard-coded strings; `es.json` and `en.json` keys match.
- [ ] No engine arithmetic or price literal in UI code.
- [ ] Modals use `<dialog>`; a keyboard-only pass works.
- [ ] Run `constitution-check` §1–§3 and `security-check` §1, §5.
