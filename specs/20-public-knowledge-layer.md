# Spec 20 — Public knowledge layer: guides, methodology and machine-readable site

Status: todo
Phase: 1 (methodology + buyer guides) · 2 (seller guides)
Depends on: 07, 08, 14, 15

## Goal

Public pages that a buyer, a seller **or an AI assistant** can use as a standalone reference for a negotiation decision. This layer is the **only** thing agents get from us (D-14, D-17): general, citable knowledge that points to the app for the personalised analysis. Each page states its sources and assumptions and leads into the matching tool. Machines get the same content in structured form: JSON-LD, Markdown alternates, sitemaps and `llms.txt`. Numbers on these pages come from the engine or the market data, never from hand-typed prose.

## Scope

In: content model, guide and methodology page templates, glossary, structured data, crawl and index files, Markdown alternates, `/acerca`, editorial checks.
Out: market city pages and studies (spec 21), measurement (spec 22), visual design. Never in scope: any endpoint that runs the engine on caller inputs (D-17). `<EngineExample>` runs the engine **at build time** on fixtures and declared inputs only.

## Requirements

### R-20.1 Content model

Astro content collections in `apps/web/src/content/{guias,metodologia}/{es,en}/*.mdx`, with a frontmatter schema in `apps/web/src/content/config.ts`:

```ts
{
  title: string;                 // ≤ 70 chars
  question: string;              // the user's question, in their words ("¿Cuánto ofrecer por debajo del precio anunciado?")
  answer: string;                // direct answer, ≤ 60 words, rendered first
  description: string;           // meta description, ≤ 160 chars
  role: 'buyer' | 'seller' | 'both';
  stage: 'before_choosing' | 'preparing_offer' | 'offer_rejected' | 'competing_buyers' | 'walk_away'
       | 'setting_price' | 'offer_received' | 'counteroffer' | 'not_selling' | 'choosing_offers' | 'concept';
  tool: { role: 'buyer' | 'seller'; prefill?: Record<string, string> } | null;
  terms: string[];               // methodology slugs used on the page
  related: string[];             // other content ids
  sources: { title: string; url: string; asOf: string }[];
  publishedAt: string; updatedAt: string; reviewedBy: string;
  translationOf?: string;        // id of the ES original
}
```

The build fails on a missing or invalid field.

### R-20.2 Page template (answer-first)

Every guide renders, in this order:

1. `<h1>` = `question`; the `answer` block directly below.
2. **En números**: at least one quantitative example, produced by `<EngineExample>` (runs `analyse()` at build time on a fixture or a declared input) or `<MarketFigure>` (resolves a market value with its kind, source and date). Purely illustrative arithmetic is wrapped in `<Illustrative>`, which prints "Ejemplo ilustrativo; no es una previsión para ninguna vivienda".
3. Body (the decision, the options, what changes the answer).
4. **Supuestos y límites**: assumptions and limitations, including "un promedio de mercado no fija el descuento de una vivienda concreta" whenever a market figure appears.
5. **Fuentes** (from `sources` and from components) and the methodology terms used.
6. `<ToolEntry>`: a button to `/comprador#nueva` or `/vendedor#nueva` with `tool.prefill` as deep-link query parameters (property facts only, R-15.12).
7. Related guides, last-updated date and reviewer.

A content lint fails when prose (outside the components above) contains a percentage or euro amount that describes the market. Allowed: numbers inside `<Illustrative>`, `<EngineExample>`, `<MarketFigure>`, and legal figures with a source (e.g. the 2-year reinvestment period).

### R-20.3 Initial guides (decision-intent clusters)

Buyer (phase 1), under `/guias/comprar/`:

| slug                 | question                                                                    | stage            | tool  |
| -------------------- | --------------------------------------------------------------------------- | ---------------- | ----- |
| `piso-sobrevalorado` | ¿Cómo saber si un piso está por encima de lo que se suele pagar en la zona? | before_choosing  | buyer |
| `cuanto-ofrecer`     | ¿Cuánto ofrecer por debajo del precio anunciado?                            | preparing_offer  | buyer |
| `rechazan-mi-oferta` | ¿Qué hacer si rechazan mi oferta por una vivienda?                          | offer_rejected   | buyer |
| `otros-interesados`  | ¿Conviene subir la oferta si hay otros interesados?                         | competing_buyers | buyer |
| `cuando-retirarse`   | ¿Cuándo es mejor renunciar a comprar un piso?                               | walk_away        | buyer |

Seller (phase 2), under `/guias/vender/`:

| slug                      | question                                                       | stage           | tool   |
| ------------------------- | -------------------------------------------------------------- | --------------- | ------ |
| `precio-de-salida`        | ¿A qué precio debería anunciar mi piso?                        | setting_price   | seller |
| `es-buena-oferta`         | ¿Cómo saber si una oferta por mi vivienda es buena?            | offer_received  | seller |
| `oferta-demasiado-baja`   | ¿Cómo responder a una oferta demasiado baja?                   | counteroffer    | seller |
| `bajar-precio-o-esperar`  | ¿Bajar el precio o esperar más compradores?                    | not_selling     | seller |
| `oferta-con-financiacion` | ¿Es mejor una oferta más baja pero con financiación asegurada? | choosing_offers | seller |

Guides use the words buyers and sellers use: "rebaja", "contraoferta", "arras", "margen de negociación". A technical term appears only next to its plain equivalent, e.g. "tu mejor alternativa (BATNA)". Each guide's ES version ships first. EN versions follow (D-15) under `/en/...` and share the `es` slug.

### R-20.4 Methodology

`/metodologia/[termino]`, one page per term:

`batna`, `precio-de-reserva`, `zopa`, `frontera-de-pareto`, `solucion-de-nash`, `kalai-smorodinsky`, `utilidad-y-pesos`, `estimacion-de-la-otra-parte` (Bayesian scenarios, Monte Carlo, confidence), `medidas-de-mercado` (the three market kinds vs the estimated range, D-19), `senales`.

Each page contains:

- a one-sentence definition (used for `DefinedTerm`);
- a buyer application and a seller application;
- the formula as used by the engine;
- a worked example computed at build time from `fixtures/housing.json` through `<EngineExample>`, stamped with `ENGINE_VERSION`;
- "Qué supone y qué no" (assumptions and limits);
- a link to the tool.

`solucion-de-nash` states that it is the Nash **bargaining** solution and not a Nash equilibrium. `frontera-de-pareto` states that Pareto efficiency is not the Pareto distribution.

`/metodologia` (index) contains: a plain-language overview of the pipeline (inputs → own BATNA → counterpart estimate → package space → recommendation); the glossary as a `DefinedTermSet`; the model-parameter table generated from `packages/engine/src/params.ts` and the spec 07 thresholds (issue 005 O-3); the engine changelog rendered from `packages/engine/CHANGELOG.md`; and the editorial and data policy.

### R-20.5 No thin pages

- A page is built only if every R-20.2 section is non-empty (build check).
- Generated pages per municipality, price band or property type are not allowed. Local pages exist only through spec 21's threshold.

### R-20.6 Structured data (JSON-LD via `<SeoHead structuredData>`)

| page                      | types                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every public page         | `Organization` (name from `SITE_NAME`, url, logo, `sameAs` when configured), `WebSite`                                                                                                                                                      |
| `/comprador`, `/vendedor` | `WebApplication` (`applicationCategory: FinanceApplication`, `operatingSystem: Web`, `inLanguage`, description of the decisions it supports, `isAccessibleForFree: true`, `offers` built from the prices served by the API, never literals) |
| guides                    | `Article` (`headline`, `datePublished`, `dateModified`, `author`/`reviewedBy`, `citation` from sources, `about` → `DefinedTerm`s), `BreadcrumbList`                                                                                         |
| methodology term          | `DefinedTerm` (`inDefinedTermSet`) + `TechArticle`, `BreadcrumbList`                                                                                                                                                                        |
| `/metodologia`            | `DefinedTermSet`                                                                                                                                                                                                                            |
| `/acerca`                 | `AboutPage` + `Organization`                                                                                                                                                                                                                |

Rules: no type that does not describe the visible page. Every string in the JSON-LD must also appear in the visible HTML (test helper). No `Review`, `AggregateRating` or `FAQPage` markup unless a later spec adds the matching visible content.

### R-20.7 Crawl and index

- `robots.txt` is generated from `apps/web/src/config/crawlers.ts` (D-18): named groups for search/answer crawlers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot) allowed on public routes, and for training crawlers (GPTBot, ClaudeBot, Applebot-Extended, CCBot, Meta-ExternalAgent, Bytespider) disallowed on `/`. `Google-Extended` is the one exception: allowed on public knowledge routes (`/guias/`, `/mercado/`, `/metodologia/`, `/acerca`) and disallowed elsewhere. Every group disallows private routes (R-15.11 list), `/api/` and query-string deep links (`/*?`). Unlisted agents (`*`) follow the search policy. The file references the sitemap. `Google-Extended` is a usage token, not a crawler: Googlebot fetches, and the token governs both Gemini training and grounding in the Gemini app, which Google does not let us split. Google Search and AI Overviews do not depend on it.
- Blocking in `robots.txt` is a request, not enforcement. App protection against automation is R-10.8 and R-11.5.
- `sitemap.xml` is a sitemap index of per-locale sitemaps of public routes, with `lastmod` from `updatedAt` (or the dataset `as_of` for spec 21) and `xhtml:link` alternates.
- `PUBLIC_SITE_URL` and `SITE_NAME` are added to `apps/web/.env.example` and the env schema.

### R-20.8 Agent-oriented files

- **Markdown alternates:** every knowledge page is also served at `<path>.md`. The file holds the title, question, answer, body (components rendered to text and tables), assumptions and limits, sources, canonical URL and `updatedAt`. Pages link to it with `<link rel="alternate" type="text/markdown">`.
- **`/llms.txt`** (llms.txt convention): `# SITE_NAME`, a `>` summary (positioning, what we are not, Spain, resale homes), then sections: _Metodología_ (term `.md` links), _Guías_, _Mercado_, _Usar la herramienta_ (what the app decides, that analyses run only in the app by the user, and the deep-link format `/comprador?ccaa=&municipio=&precio=&dias=#nueva`, R-15.12), _Políticas_ (`/acerca`, `/terminos` with the no-automated-access rule, disclaimer). Generated at build time; never hand-edited. No API or MCP endpoint is listed.

### R-20.9 `/acerca`

Who operates the site, contact, what the product is and is not (Constitution §1 positioning and principle 10), editorial policy (review cadence, how corrections are published), data policy (sources, reuse, D-19), and the regulatory disclaimer.

### R-20.10 Copy rules (enforced by the `public-content` skill and a word-list lint)

Forbidden in public content and UI: "tasación", "valor real", "precio justo", "te garantizamos", "el precio más bajo", "el mejor precio" (and EN equivalents). Counterpart and outcome figures say "estimado".

### R-20.11 Freshness

Every page shows `updatedAt`. A page not reviewed for 6 months appears in a build warning list. A page that embeds a stale market value (> 12 months) shows the staleness note from spec 14 R-14.6.

## Acceptance criteria

- AC-20.1 Build fails when a guide lacks `answer`, `tool`, a quantitative component or a source (one test per missing item).
- AC-20.2 Content lint flags "el descuento medio es del 10 %" in prose and accepts the same figure inside `<MarketFigure>`.
- AC-20.3 The `batna` page's worked example equals the golden values of `fixtures/housing.json` (buyer 41.25, seller 26.25) and shows the current `ENGINE_VERSION`.
- AC-20.4 JSON-LD on one guide, one methodology term, `/comprador` and `/metodologia` parses, uses only the R-20.6 types, and every string value appears in the visible HTML.
- AC-20.5 `robots.txt` disallows `/comprador/p/` and `/api/` for every group, allows `OAI-SearchBot`, `ChatGPT-User` and `Claude-SearchBot` on `/guias/`, disallows `/` for `GPTBot`, `ClaudeBot` and `CCBot`, and allows `Google-Extended` on `/metodologia/` while disallowing it on `/comprador`.
- AC-20.6 `sitemap.xml` lists every public knowledge page in both locales where translated, and no private route.
- AC-20.7 `/metodologia/batna.md` returns `text/markdown` with the definition, worked example and canonical URL; `/llms.txt` lists it.
- AC-20.8 The forbidden-word lint fails on "tasación" in a guide.
- AC-20.9 Phase 1 exit: the 10 methodology pages and the 5 buyer guides exist in ES and pass AC-20.1–20.4.

## Files

`apps/web/src/content/**`, `apps/web/src/content/config.ts`, `apps/web/src/components/{EngineExample,MarketFigure,Illustrative,ToolEntry,SeoHead}.astro`, `apps/web/src/pages/{guias,metodologia,acerca}/**`, `apps/web/src/pages/{robots.txt,sitemap.xml,llms.txt}.ts`, `apps/web/src/config/crawlers.ts`, `scripts/content-lint.ts`, tests.
