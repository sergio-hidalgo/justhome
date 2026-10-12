---
name: testing
description: Callable skill — how tests are written, named and organised in vivienda-negocia (Vitest, fast-check, Playwright + axe, pgTAP). Invoke at the start of every spec, before writing the first test, and whenever you add or change an acceptance-criterion test, a fixture, a snapshot or a benchmark.
---

# Testing

AGENTS.md rule: **every acceptance criterion becomes at least one automated
test**, named after its ID. This skill says how.

## Naming and traceability

- `it('AC-03.4 weightsFromSwing normalises to 0.5 / 0.25 / 0.25', …)` — ID
  first, then the behaviour. One criterion may have several tests; each starts
  with the same ID.
- Property tests (spec 08 R-08.3) carry the spec's criterion
  (`AC-06.3`, `AC-06.4`, `AC-08.2`), plus the property name.
- Before declaring done, list the spec's `AC-NN.N` ids and grep that each one
  appears in a test name. Report any missing id in the summary — never skip one
  silently.
- Requirements without an AC (R-…) that carry behaviour still get a test named
  by the requirement (`R-11.5 …`).

## Which tool for which layer

| layer | tool | location |
|---|---|---|
| `packages/engine`, `packages/schemas` | Vitest (+ fast-check for properties) | `*.test.ts` beside the module; engine golden/property/snapshot tests in `packages/engine/test/**` |
| `apps/api` routes | Vitest + Fastify `inject()`, contract tests: happy path + main error per endpoint (AC-11.1) | beside the route |
| Postgres: RLS, triggers, cron | pgTAP | `supabase/tests/*.sql`, test names carry `AC-09.x` |
| Web pages/islands | Vitest for logic; Playwright for flows | `apps/web` |
| Accessibility | `@axe-core/playwright` on `/`, `/comprador`, `/vendedor`, `/precios` (AC-15.5) | Playwright |
| Responsive | Playwright at 360 px, no horizontal scroll (AC-16.6) | Playwright |

## Rules

1. **Determinism.** No real clock, randomness or network in unit tests. Inject
   dates; seed PRNGs; use fast-check with a fixed seed and 200 runs
   (R-08.3). Stripe and Supabase run in test mode / local only.
2. **Fixtures are read-only.** `/fixtures/*.json` are the recomputed reference
   (Constitution §9). Never edit a fixture to make a test pass. If a fixture
   looks wrong, write an issue.
3. **Tests must be able to fail.** For the engine, include the guard of
   AC-08.3: perturbing a fixture weight must break at least one golden test.
4. **Snapshots are versioned.** An engine-output snapshot change needs a
   `ENGINE_VERSION` bump and a `packages/engine/CHANGELOG.md` line in the same
   commit (R-08.4). Never run `-u` to "make it green".
5. **Table-driven for rule matrices.** Entitlements (AC-12.1) test every cell
   of the R-12.2 table; keep the table in the test so a reviewer can diff it
   against the spec.
6. **Market numbers in tests come from fixtures or a test-local market object**,
   never from engine constants; never copy superseded figures (15 %, 35 %, 11 %
   — Constitution §9, issue 003).
7. **UI numbers are not re-derived.** Dashboard tests feed a mocked API response
   and assert the rendered values match it (AC-16.5).
8. **Privacy in tests.** Synthetic people, labels like "Comprador A", fake
   catastral references; response-filter tests (AC-19.4) assert the *absence*
   of the other side's fields by key and by value.
9. **Never weaken an assertion to go green.** If the spec and the code
   disagree, fix the code or open an issue; do not loosen tolerances beyond
   what the spec states (e.g. ±1 € in AC-05.5, ±1e-9 for weights).
10. **Performance.** The engine benchmark (AC-06.6, R-08.5) runs in CI:
    warning above 800 ms, failure above 1,000 ms p95 for 7 issues × 5 levels ×
    1,000 draws.

## Definition of done for tests

- [ ] Each `AC-NN.N` of the spec appears in at least one test name.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green at the root;
      `pnpm test:e2e` green when the spec touches `apps/web`.
- [ ] No `.only`, `.skip` or `todo` left without an issue file.
- [ ] New fixtures/snapshots are listed in the commit summary.
