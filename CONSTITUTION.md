# Constitution

Binding for every spec. If a spec contradicts this file, this file wins and an issue is opened.

## 1. Product in one paragraph

A web app for buyers and sellers of resale homes in Spain. The user describes a property, their own position and priorities, and what they observe about the other side. A deterministic engine computes both sides' BATNA, the ZOPA, the Pareto frontier and a Nash-fair package, and tells the user what to offer, what to trade and when to walk away. Buyers: freemium + one-off packs. Sellers: account + subscription (first analysis free). Later, when buyer and seller of the same property are both on the platform, the app orchestrates one outcome that is good for both.

## 2. Principles (non-negotiable)

1. **Decide, don't teach.** Every screen answers "what should I do now with this property?".
2. **Estimates, never certainties.** Every counterpart figure carries a range (p10–p90) and a confidence level (low / medium / high). Copy says "estimado".
3. **Progressive profiling.** ≤ 3 questions per moment; taps over typing; "No lo sé / I don't know" is always a valid answer and keeps the prior.
4. **Non-manipulative.** Scripts are questions to learn facts. Never suggest exploiting private hardship. Never ask about the counterpart's debts, mortgage balance, health or family situation beyond a coarse "reason for hurry".
5. **Money first.** Housing issues are monetisable: show utility points and their euro equivalent side by side.
6. **The engine is the product.** It is pure, deterministic, versioned and tested before any UI depends on it.
7. **Functional UI first.** v1 UI is plain, accessible and complete (forms, lists, dashboards, analyses). Visual/marketing UX comes later and must not require engine or API changes.
8. **Privacy by design.** Counterparts are labels, not people. Joint mode never reveals one side's private inputs to the other.

## 3. Stack (decided)

| Concern    | Choice                                                                     |
| ---------- | -------------------------------------------------------------------------- |
| Monorepo   | pnpm workspaces + Turborepo                                                |
| Language   | TypeScript strict everywhere                                               |
| Web        | Astro (SSR, `@astrojs/node`), islands in Preact                            |
| API        | Fastify (separate service)                                                 |
| Validation | Zod schemas shared from `packages/schemas`                                 |
| Engine     | `packages/engine`, pure TS, zero runtime deps except a seeded PRNG         |
| DB / Auth  | Supabase (Postgres, Auth incl. anonymous sign-in, RLS)                     |
| Payments   | Stripe Checkout (one-off), Stripe Billing (subscriptions), Customer Portal |
| Tests      | Vitest (unit/property via fast-check), Playwright (e2e)                    |
| i18n       | ES (default) + EN from day one                                             |
| PDF export | server-side render (decided in spec 18)                                    |

## 4. Product decisions (from doc rev 569)

| ID   | Decision                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Buyer free tier: anonymous session, 1 property, 3 fixed issues (price, closing date, transaction costs), preset weight profiles, ≤ 3 signals, confidence capped at "low", no history/export.                                                                              |
| D-02 | Buyer **Pack 5**: one-off **€14.95**, 5 property slots, **expires 6 months** after purchase. Packs stack.                                                                                                                                                                 |
| D-03 | A slot is consumed at property creation. **Archiving does not free a slot.**                                                                                                                                                                                              |
| D-04 | Expired pack: its properties become read-only; no new properties from that pack.                                                                                                                                                                                          |
| D-05 | Seller requires an account from the start. **First analysis free** (one property, one analysis run), then subscription required.                                                                                                                                          |
| D-06 | Seller plans (monthly, recurring): **Seller 5** — 1–5 active properties, **€19.95/month**; **Seller Plus** — 6+ active properties, **€39.95/month** (upper cap configurable, default unlimited).                                                                          |
| D-07 | Seller subscription lapsed → seller properties read-only.                                                                                                                                                                                                                 |
| D-08 | API is a separate **Fastify** service.                                                                                                                                                                                                                                    |
| D-09 | Market reference data updated **manually** from public periodic sources (CSV import); automated feeds later. Every value stores `source_url` and `as_of`.                                                                                                                 |
| D-10 | Languages at launch: **Spanish and English**.                                                                                                                                                                                                                             |
| D-11 | Joint mode: **internal orchestration** that detects buyer and seller negotiating the same property and coordinates the best outcome for both, **without changing either user's tier**. Discovery: **both** invite links **and** opt-in notification on fingerprint match. |
| D-12 | Data entry for property and position happens in **modal pop-ups inside `/comprador` and `/vendedor`**, not separate routes.                                                                                                                                               |
| D-13 | Scope: resale homes, individual buyers and sellers.                                                                                                                                                                                                                       |

## 5. Engine invariants

- Pure functions, no I/O, no `Date.now()`, no `Math.random()`. Randomness comes from a seeded PRNG whose seed = hash of normalised inputs.
- Same inputs + same `ENGINE_VERSION` ⇒ byte-identical output.
- Utilities live on [0, 100]; weights sum to 1 (±1e-9).
- The Nash package, when one exists, is always inside the strict ZOPA and on the Pareto frontier.
- Market priors (margins, cost ranges, ITP rates) are **inputs**, never constants in code.

## 6. Conventions

- Money: integer euro cents in DB and API; euros (number) inside the engine; formatted with `Intl.NumberFormat(locale, {currency:'EUR'})` in UI.
- Dates: ISO `YYYY-MM-DD` strings; durations in days.
- IDs: UUID v4.
- Naming: DB `snake_case`, TS `camelCase`, routes Spanish slugs (English aliases redirect).
- Every API response with engine output includes `engineVersion`.
- Feature flags: `FLAG_JOINT_MODE`, `FLAG_EXPORT`.

## 7. Glossary

| Term             | Meaning                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Issue            | A negotiable dimension (price, closing date…)                                              |
| Package (ω)      | One level chosen for every issue                                                           |
| Value function u | Maps an issue level to [0,100] for one side                                                |
| Weight w         | Importance of an issue for one side; Σw = 1                                                |
| U(ω)             | Σ w·u — total utility of a package for one side                                            |
| BATNA b          | Utility of the best alternative to agreement                                               |
| Surplus s        | U(ω) − b                                                                                   |
| Strict ZOPA      | Packages with U > b for both sides                                                         |
| Pareto frontier  | Non-dominated packages in the ZOPA                                                         |
| Nash package     | argmax s_me · s_other on the frontier                                                      |
| KS point         | Frontier point equalising proportional gains toward each side's ideal                      |
| Scenario A/B/C   | Seller lives there & hasn't bought / already bought (double burden) / needs to sell to buy |
| Signal           | An observation logged by the user that updates the counterpart estimate                    |
| Slot             | Right to create one buyer property from a pack                                             |

## 8. Phase exit criteria

| Phase       | Specs | Exit                                                                                                       |
| ----------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| 0 Engine    | 01–08 | All golden fixtures pass; property tests green; analyse < 1 s p95 on 7 issues × 5 levels                   |
| 1 Buyer MVP | 09–16 | Anonymous user completes a full analysis; Pack 5 purchase unlocks 5 slots end-to-end in Stripe test mode   |
| 2 Seller    | 17–18 | Seller ranks ≥ 2 offers on one property; subscription lifecycle works in test mode                         |
| 3 Joint     | 19    | Two test accounts on the same property receive one coordinated proposal without seeing each other's inputs |

## 9. Known corrections to the source notes

The DeepSeek worked examples contain errors; fixtures in `fixtures/` are recomputed and are the reference:

- Housing example: seller BATNA was given as 56.25, but with the stated seller value table (30 days = 0 for the seller) it is **26.25**. The ZOPA, frontier and Nash package change accordingly.
- Housing ZOPA table utilities did not match the stated weights.
- Freelance logrolling paragraph contradicted itself; the freelance metrics (ZOPA 5, frontier 3, Nash = 10,000 € / 4 weeks / 60%) are correct.
- Market figures in the notes are superseded by sourced 2026 data in `data/market/2026-10-12.csv` (see `docs/market-sources.md`): e.g. Granada's negotiation gap is 9 % (Fotocasa H1 2026), not 35 %; no Madrid figure is published, so the national proxy of 6 % (idealista Q2 2026 average listing cut) applies with low confidence.
