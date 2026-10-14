# Issue 005: AI assistants and agents as a third audience (GEO, read-only)

Status: resolved
Found while implementing: pre-implementation review (product strategy input, 2026-10-14)
Affects specs: 02, 04, 05, 07, 09, 10, 11, 14, 15, 16, 17, 18; new 20, 21, 22
Type: product-decision-needed

## What happened

The product was specified for two audiences (buyers, sellers). External strategy notes (a GEO review produced with ChatGPT, kept out of the repo) recommend treating AI assistants as a third audience: they increasingly answer "¿cuánto ofrezco por este piso?" themselves, and they cite or recommend sites that give them reliable, specific material.

Game-theory definitions in those notes are **not** adopted where they differ from `CONSTITUTION.md §7`. For example, the notes' "estimated fair value" input does not exist in our engine. The advice that is adopted:

1. Position around **decisions** (what to offer, whether to accept, when to walk away), in users' own words, not around game theory.
2. Keep three market measures apart (asking-to-sale discount, market price gap or listing cut, and the estimated range for one property). Never apply a universal discount.
3. Publish **original, sourced, periodic market intelligence** with explicit provenance, respecting each source's reuse terms.
4. Organise **decision-intent clusters** per buyer and seller journey: direct answer, numeric example, assumptions, limitations, references, entry into the tool. No thin programmatic pages.
5. Technical GEO: server-rendered content, JSON-LD that matches the page, stable URLs, canonical, sitemaps, `hreflang`, Markdown alternates, `llms.txt`, and an explicit crawler policy.
6. The tool must offer value an assistant cannot summarise: the personalised analysis. That is the conversion boundary.
7. Measure citations, recommendations, category recognition and AI-referred completed analyses with a fixed question benchmark.
8. Separate decision support clearly from valuation, legal, mortgage and estate-agency activity.

## Decisions (product owner, 2026-10-14)

| #   | Question                 | Decision                                                                                                                                                                                                                                                                                                |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O-1 | What may an agent do?    | **Read only.** Agents get general information (guides, market, methodology) and point users to the app. No public analysis API, no handoff drafts. A deep link may prefill property facts only. Rationale: an agent running analyses would be a bypass of paid tiers and a cost with little conversion. |
| O-2 | Training crawlers        | **Disallowed everywhere, except `Google-Extended` on public knowledge routes** (decided 2026-10-14, to keep Gemini-app citations). Search and user-initiated fetchers are allowed on public routes.                                                                                                     |
| O-5 | MCP / agent integrations | **None.** See advice below. An account-scoped integration may be reconsidered later through a new decision.                                                                                                                                                                                             |
| O-6 | Business model           | **Self-service only.** No advisory, brokerage or human negotiation service.                                                                                                                                                                                                                             |
| —   | Spec process             | Amendments to specs that are still `todo` are folded into the specs; amendment files are kept only for specs already `done` (AGENTS.md, "Changing specs").                                                                                                                                              |

Still open, with defaults in force until changed:

| #   | Question                                           | Default                                                                                             |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| O-3 | Publish engine model parameters on `/metodologia`? | Yes: formulas, decision thresholds and the `params.ts` table. Signal likelihoods are not published. |
| O-4 | Licence for our published aggregates               | CC BY 4.0 for our own derived aggregates; third-party `cite_only` figures excluded from downloads.  |
| O-7 | Brand name in JSON-LD and `llms.txt`               | From `SITE_NAME` env, never hard-coded.                                                             |

## Advice recorded with the decisions

**MCP is not needed for discovery.** An MCP server lets an assistant _call_ our functions, and only after a user installs or connects it. Assistants that find us through search read HTML (and Markdown alternates), never MCP. For "agents land on the page and extract what is relevant", the public knowledge layer is the whole mechanism: prerendered pages, JSON-LD, `.md` copies, CSV datasets and `llms.txt`. These are static and cacheable, so they cost almost nothing per agent visit. An MCP server or public analysis API would run the engine per call: compute cost without a paying user, plus a path around D-01…D-07. The only integration worth revisiting later is **account-scoped**: a signed-in paying user connects their own assistant, and every call counts against their plan.

**Crawler trade-off.** Blocking training crawlers (GPTBot, ClaudeBot, Applebot-Extended, CCBot…) does not affect ChatGPT search (OAI-SearchBot / ChatGPT-User), Claude search (Claude-SearchBot / Claude-User), Perplexity, Bing/Copilot, or Google Search including AI Overviews (Googlebot). Cost: future non-Google models learn less about the brand from training data. `Google-Extended` is allowed on public knowledge routes because it is the only switch for Gemini-app grounding; Google offers no grounding-only option, so allowing it also permits Gemini training on those pages.

**`robots.txt` is a request, not a fence.** Agents that browse the app like a person are stopped by CAPTCHA on anonymous sign-in, per-IP caps and terms of use (spec 10 R-10.8, spec 11 R-11.5), not by `robots.txt`.

## Resolution

- `CONSTITUTION.md`: positioning, self-service, three audiences (§1); principles 1, 8–11; stack (content, bot protection); D-14…D-20; conventions; glossary; phases 1 and 2; §9.
- Specs edited in place: 02 (catalogue, provenance, descriptions), 04, 05 (params, catalogue, confidence lowering), 07 (assumptions, limitations, `packages/i18n`), 09 (market columns, `market_sources`), 10 (CAPTCHA, per-IP caps, terms), 11 (`/docs` non-prod, anonymous caps), 14 (measure kinds, source registry), 15 (knowledge routes, SSR/head, deep-link prefill), 16 and 17 (split wizards, assumptions panel, methodology links), 18 (assumptions in PDF). Earlier amendments 02, 14, 15, 16 and 17 were folded in the same way and deleted.
- New specs: 20 public knowledge layer, 21 market intelligence, 22 GEO measurement.
- Skills: new `public-content`; `constitution-check`, `security-check` and `engine-guardrails` updated.
