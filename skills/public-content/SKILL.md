---
name: public-content
description: Callable skill — checklist for public knowledge pages (guides, market intelligence, methodology, /acerca, llms.txt, robots, sitemap, JSON-LD). Invoke before writing or changing anything under apps/web/src/content, the knowledge routes, SeoHead/structured data or crawl files (specs 15, 20, 21, 22).
---

# Public content

Public pages serve three readers: a buyer, a seller and an AI assistant that
may cite or recommend us (Constitution §1, D-14…D-20). Each page must be
useful on its own as a reference **and** lead into the tool. This is the only
thing agents get from us: general knowledge, never a personalised analysis
(D-17).

## Every page

- [ ] Answer-first: `<h1>` is the user's question in their words; the direct
      answer (≤ 60 words) comes right after it (R-20.2).
- [ ] At least one quantitative example via `<EngineExample>`,
      `<MarketFigure>` or `<Illustrative>`. No market % or € literal in prose
      (content lint).
- [ ] Assumptions and limitations section present; any market figure comes
      with "un promedio no fija el descuento de una vivienda concreta".
- [ ] Sources listed with date; methodology terms linked; `<ToolEntry>` to the
      right role, prefilling property facts only (R-15.12).
- [ ] No interactive calculator or form on public pages that runs the engine
      on visitor inputs; `<EngineExample>` runs at build time on fixtures.
- [ ] Plain words first, jargon second: "tu mejor alternativa (BATNA)".
- [ ] No forbidden wording: tasación, valor real, precio justo, garantizamos,
      el precio más bajo / el mejor precio (principle 10).
- [ ] Counterpart and outcome figures say "estimado".
- [ ] Nash = bargaining solution (not equilibrium); Pareto = efficiency (not
      distribution); copy never conflates them.
- [ ] `updatedAt`, `reviewedBy` set; ES first, EN shares the slug.

## Market figures (D-19)

- [ ] Every figure names its kind: asking-to-sale discount, market price gap
      or listing price cut. Never combined, never called "the discount".
- [ ] The engine's range is "rango de negociación estimado para esta
      vivienda", never a market statistic.
- [ ] Source has a `sources.csv` entry with `reuse`; `cite_only` values are
      quoted with attribution and never in downloads.
- [ ] No local page without sourced, non-stale local data (no thin pages).

## Machine-readable twin

- [ ] Server-rendered; full text visible with JS disabled.
- [ ] One canonical on `PUBLIC_SITE_URL`; hreflang es/en/x-default when
      translated; private routes `noindex` and absent from sitemap.
- [ ] JSON-LD only of the R-20.6 / R-21.6 types, and every string in it is on
      the visible page. No Review/Rating/FAQ markup.
- [ ] `.md` alternate renders and is linked; `llms.txt` and sitemap pick the
      page up automatically (never hand-edited); `llms.txt` lists no API.
- [ ] `robots.txt`: search/user fetchers allowed, training crawlers
      disallowed except `Google-Extended` on knowledge routes (D-18).
- [ ] Stable URL: renames need a 301; superseded content links forward.

## Before you commit

- [ ] `pnpm content:lint` and the build checks pass.
- [ ] Run `constitution-check` §1 (principles 1, 2, 9, 10) and §2 (D-15,
      D-16, D-18, D-19).
