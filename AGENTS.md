# AGENTS.md — instructions for coding agents

## Before you start a spec

1. Read `CONSTITUTION.md` (binding) and the spec you were assigned.
2. Read every spec listed under **Depends on**; do not read later specs.
3. Read every `specs/*-amendment.md` whose `Amends:` line names the spec you are implementing or one you read in step 2. Where an amendment and its spec disagree, the amendment wins.
4. If anything is ambiguous or contradicts the constitution, stop and write `issues/NNN-<slug>.md` from `issues/_TEMPLATE.md`. Do not guess product rules.

## While implementing

- Touch only the files listed under **Files** unless the spec says otherwise.
- Every acceptance criterion becomes at least one automated test (Vitest or Playwright). Name tests after the criterion ID, e.g. `it('AC-03.4 ...')`.
- Engine code: no I/O, no `Date.now()`, no `Math.random()`; use `createRng(seed)` from `packages/engine/src/rng.ts`.
- Never hard-code market numbers (margins, costs, ITP). They come from `market_reference` or test fixtures.
- Money crosses the API as integer cents.
- UI copy goes through i18n keys (`apps/web/src/i18n/{es,en}.json`), never inline strings.
- Keep v1 UI functional: semantic HTML, native `<dialog>` for modals, minimal CSS from `apps/web/src/styles/base.css`. No design system work.

## Skills (`/skills/<name>/SKILL.md`)

Skills are working checklists. They never override `CONSTITUTION.md` or the spec; if they conflict, stop and write an issue.

| When                                                                                          | Invoke                                                                                          |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Start of every spec; before writing the first test                                            | `testing`                                                                                       |
| Any change under `packages/engine`, or code that builds/consumes `EngineInput`/`EngineOutput` | `engine-guardrails`                                                                             |
| Any change under `supabase/`                                                                  | `supabase-migrations`                                                                           |
| Any change under `apps/api`                                                                   | `api-fastify`                                                                                   |
| Any change under `apps/web`                                                                   | `web-ui`                                                                                        |
| Before declaring a spec done — **always**                                                     | `constitution-check` and `security-check` (report pass / fail / n-a per section in the summary) |
| A refactor is requested, or a file exceeds the size limits                                    | `code-refactor`                                                                                 |

Decisions are tracked in `issues/`. Issues 001–004 are resolved by amendments in `specs/` (`*-amendment.md`).

## Definition of done (every spec)

- [ ] All acceptance criteria covered by passing tests
- [ ] `constitution-check` and `security-check` run against the diff; no failing item
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green at repo root
- [ ] No TODOs left without an issue file
- [ ] One commit, message: `spec NN: <title>`
- [ ] Spec status line updated to `Status: done`

## Commands (after spec 01)

```
pnpm i
pnpm dev            # web :4321, api :3001, supabase local
pnpm test           # all unit tests
pnpm test:e2e       # playwright
pnpm db:reset       # supabase reset + seed
```

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
