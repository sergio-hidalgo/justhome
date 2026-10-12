# Spec 08 — Engine: golden fixtures and property tests

Status: todo
Phase: 0
Depends on: 03–07

## Goal

Lock the engine's behaviour with recomputed reference cases and invariants, so later refactors and UI work can't silently change results.

## Requirements

R-08.1 Fixture loader `packages/engine/test/fixtures.ts` reads `/fixtures/*.json` and maps them to `EngineInput` with a **known** counterpart (no estimation) and discrete levels exactly as listed.

R-08.2 Golden tests:

| fixture | asserts |
|---|---|
| `freelance.json` | BATNAs 32.5 / 52.5; ZOPA 5 packages (exact set); frontier 3; Nash (10k, 4, 60), product 156.25, pie 50 % |
| `housing.json` | BATNAs 41.25 / 26.25; ZOPA 10; frontier 5; Nash tie listed in `nashTie`, chosen `(300k, 90 d, split)` via KS distance |
| `estimate-madrid.json` | reservation p50 per case (spec 05 AC-05.5) |

R-08.3 Property tests (fast-check, 200 runs each, seeded):
- utilities ∈ [0,100];
- Nash ∈ frontier ⊆ ZOPA;
- frontier members mutually non-dominated;
- swapping `me` and `other` in a known-counterpart input yields the same Nash package (symmetry);
- `analyse` is deterministic for identical input;
- adding a dominated package never changes the Nash package.

R-08.4 Snapshot test of full `EngineOutput` for each fixture, versioned by `ENGINE_VERSION`. A snapshot change requires bumping the version and a line in `packages/engine/CHANGELOG.md`.

R-08.5 Benchmark job in CI (non-blocking warning at > 800 ms, failing at > 1,000 ms p95).

## Acceptance criteria

- AC-08.1 All golden tests pass.
- AC-08.2 All property tests pass with fixed seed.
- AC-08.3 Changing any weight in a fixture makes at least one golden test fail (guards against tests that assert nothing).
- AC-08.4 CHANGELOG entry exists for `0.1.0`.

## Files

`packages/engine/test/**`, `packages/engine/CHANGELOG.md`, `/fixtures/*.json` (read-only).
