---
name: code-refactor
description: Callable skill — how to refactor safely in vivienda-negocia. Invoke when the user asks for a refactor, cleanup, restructuring or "make this better"; also self-invoke when a file you're editing exceeds the size limits defined here. Do NOT bundle refactors into a spec task — a spec's commit contains only what the spec asks for.
---

# Code Refactor

A refactor is behaviour-preserving. Anything that changes behaviour, a contract,
a schema, an engine output or user-facing copy is a spec (or an issue), not a
refactor.

## When to trigger yourself

- A file you're editing exceeds: 250 lines (`.astro` page or component),
  300 lines (Preact island / `.ts` module in `apps/web`), 400 lines (a Fastify
  service in `apps/api`), 500 lines (an engine module), or a function exceeds
  ~60 lines / 4 nesting levels.
- You find a request/response shape, an issue key, an error code or a flag key
  defined outside `packages/schemas` — that is a contract violation, fix it
  schemas-first.
- You find a colour, spacing or font literal outside the CSS variables in
  `apps/web/src/styles/base.css`, or a user-facing string outside
  `apps/web/src/i18n/{es,en}.json` — same rule, tokens/keys first.
- You find a market number (margin, cost range, ITP, rent) inside engine code —
  see `engine-guardrails` and `issues/001-*`.
- Otherwise: only when explicitly asked.

## Procedure

1. **Scope statement first**: list what will change and, more importantly, what
   will NOT: routes and slugs, API responses, `packages/schemas` types,
   migrations, env variable names, i18n keys, engine output, `ENGINE_VERSION`.
2. **Tests before movement**: if the code you're moving lacks tests, write
   characterization tests first (see `testing`), then refactor, then confirm
   green. For `packages/engine` the golden fixtures and snapshots are the
   safety net — they must pass **unchanged**.
3. Move in small compiling steps — rename, extract, relocate — running
   `pnpm lint && pnpm typecheck && pnpm test` from the root between steps.
4. Respect boundaries while moving code:
   - apps never import each other by relative path; shared code goes to
     `packages/*` and is depended on via `workspace:*`;
   - `packages/engine` stays pure: no I/O, no `Date.now()`, no `Math.random()`,
     no runtime dependency except the seeded PRNG (`engine-guardrails`);
   - `apps/web` never holds the service-role key and never computes engine
     numbers; it renders what the API returns (`web-ui`);
   - routes hold HTTP only; logic lives in `apps/api/src/services`
     (`api-fastify`);
   - an `.astro` component stays `.astro` unless it needs client state — do not
     turn static markup into an island;
   - the entitlements module is the single decision point for tiers; DB
     triggers mirror it, never the other way round.
   A refactor that "simplifies" by crossing a boundary is a regression.
5. **Commit policy**: a refactor requested on its own is its own commit
   (`refactor: <what>`). A refactor discovered during a spec is either
   (a) required for the spec and listed in the spec's **Files**, or
   (b) written up as `issues/NNN-<slug>.md` and left alone. Never mix it into
   the `spec NN: <title>` commit.
6. Finish with a summary: files moved/renamed, LOC delta, any TODOs left (each
   with an issue file), and an explicit confirmation that no route, contract,
   schema, i18n key, engine output or `ENGINE_VERSION` changed.

## Style targets

- Prefer extracting pure, UI-free and server-free logic (validation,
  formatting, money mappers) into `packages/schemas`, and numerical logic into
  `packages/engine`, once a second consumer appears.
- Kill dead code — don't comment it out.
- Protected vocabulary — never rename, translate or "improve":
  - route slugs `comprador`, `vendedor`, `mesa`, `mis-viviendas`, `extra-info`,
    `oferta`, `precios`, `cuenta` (English aliases only redirect);
  - glossary terms from `CONSTITUTION.md §7` (BATNA, ZOPA, Pareto, Nash, KS,
    package, surplus, signal, slot) in identifiers and docs;
  - error codes `slot_limit`, `plan_required`, `account_required`,
    `tier_limit`, `read_only`, `validation`, `not_found`, `recompute_limit`;
  - flag names `FLAG_JOINT_MODE`, `FLAG_EXPORT`; signal codes in the catalogue.
- Naming: DB `snake_case`, TS `camelCase`, identifiers in English, user-facing
  copy in i18n files only.
- Money stays integer cents on the API/DB side and euros inside the engine;
  conversions happen only in the `toEngine()` / `fromEngine()` mappers.
