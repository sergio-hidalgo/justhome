# Spec 22 — GEO measurement and AI-channel attribution

Status: todo
Phase: 2
Depends on: 15, 20, 21
Constitution: D-20

## Goal

Know whether AI assistants (1) **cite** our research, (2) **recommend** the product as a tool, and (3) send people who **complete an analysis** in the app. Measure each role (buyer, seller) separately, without tracking individuals. Of these, (2) and (3) are what turn AI visibility into customers; (1) shows the content is useful.

## Scope

In: question benchmark, run records, scorecard, cookieless channel aggregates, search-console verification.
Out: third-party analytics SDKs, per-user tracking, automated querying of assistants that breaks their terms of use.

## Requirements

### R-22.1 Benchmark

`geo/benchmark/questions.yaml`: ≥ 50 buyer and ≥ 50 seller questions in Spanish, plus ≥ 20 per role in English. Each entry:

```yaml
- id: b-offer-01
  role: buyer # buyer | seller
  stage: preparing_offer # same enum as R-20.1
  intent: decision # decision | information | tool
  locale: es
  text: 'He encontrado un piso en Valencia anunciado a 280.000 €. ¿Cuánto debería ofrecer?'
  expectedPages: [/guias/comprar/cuanto-ofrecer, /mercado/valencia]
  expectedTool: buyer
```

Questions are phrased as real users ask; most never mention BATNA or game theory. They are seeded from the R-20.3 decision-intent tables and extended from search-console queries.

### R-22.2 Runs

- Records go in `geo/runs/<YYYY-MM-DD>/<assistant>.csv` with columns `question_id, assistant, mode, cited, cited_urls, recommended, category_correct, answer_excerpt, notes`.
  - `recommended`: the product was suggested as a tool to use.
  - `category_correct`: the assistant described us as negotiation decision support, not as an agency, portal or valuation.
- Assistants: ChatGPT, Claude, Gemini / Google AI Overviews, Perplexity, Microsoft Copilot.
- Cadence: monthly for the first 6 months after launch of spec 20, then quarterly. Runs are manual, or use official APIs within their terms.
- `docs/geo-runbook.md` describes the procedure so runs are comparable: fresh session, no personalisation, same wording.

### R-22.3 Scorecard

`pnpm geo:score [run-date]` writes `geo/reports/<date>.md` with these rates, per assistant and overall, split buyer vs seller and by stage:

- relevant answer citation rate;
- brand recommendation rate;
- category recognition rate;
- buyer vs seller coverage;
- delta vs the previous run.

The report always states `n` and the run date.

### R-22.4 AI-channel attribution (web, cookieless)

- Middleware classifies the landing request into a channel:
  - from `utm_source` / `utm_medium`, or from the referrer host list in `apps/web/src/config/ai-referrers.ts` (e.g. `chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com`);
  - result: `ai:<name>`, `search`, `direct` or `other`.
- The channel and landing type (`guide`, `market`, `methodology`, `tool`, `home`) are kept in `sessionStorage` only. No cookie, no IP, no user id.
- Aggregate table `channel_daily (day, channel, landing_type, landings, deep_link_landings, wizard_started, analyses_completed)`, incremented through `POST /api/metrics/channel`:
  - unauthenticated, rate-limited per IP, enum-validated, no free text;
  - RLS on; service-role read only.
- `deep_link_landings` counts arrivals carrying R-15.12 prefill parameters. These are the closest signal of an assistant sending a user into the tool.

### R-22.5 Reports and consoles

- `pnpm geo:channels --from --to` prints CSV from `channel_daily` (service role).
- `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` env values render their meta tags when set.
- `docs/geo-runbook.md` covers sitemap submission and reading Bing Webmaster Tools AI performance (citations) and Google Search Console.

## Acceptance criteria

- AC-22.1 `questions.yaml` validates against its schema; counts per role and locale meet R-22.1; every `expectedPages` path exists in the sitemap.
- AC-22.2 `pnpm geo:score` on a fixture run produces the rates with correct values and `n`.
- AC-22.3 A landing with referrer `https://chatgpt.com/` is classified as `ai:chatgpt`, and one with `utm_source=claude.ai` as `ai:claude`. A completed analysis in the same tab increments `analyses_completed` for that channel.
- AC-22.4 Attribution sets no cookie, and `channel_daily` has no column that can identify a user.
- AC-22.5 A landing on `/comprador?municipio=Madrid&precio=300000` increments `deep_link_landings`.

## Files

`geo/**`, `scripts/geo-score.ts`, `scripts/geo-channels.ts`, `apps/web/src/middleware.ts`, `apps/web/src/config/ai-referrers.ts`, `apps/api/src/routes/metrics.ts`, a new migration for `channel_daily`, `docs/geo-runbook.md`, tests.
