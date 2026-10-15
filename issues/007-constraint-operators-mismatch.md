# Issue 007: Spec 03 constraint operators are not in the spec 02 schema

Status: resolved
Found while implementing: spec 03
Affects specs: 02, 03
Type: contradiction

## What happened

Spec 03 R-03.3 asks `satisfies(position.constraints, pkg)` to support the operators `<=`, `>=`, `==`, `!=` and `in`. The `hardConstraint` schema of spec 02 (`Status: done`), and the constraint field of the `buyerPrioritiesStep` / `sellerPrioritiesStep` form schemas, only allow `<=`, `>=` and `=`, and `value` is a single number or string. `in` needs a list of values.

## Expected

One set of operators shared by the schema and the engine (AGENTS.md: do not guess product rules).

## Reproduce

1. Read spec 03 R-03.3.
2. Read `packages/schemas/src/position.ts` (`hardConstraint`) and `forms.ts` (priorities step `constraints`).

## Proposed resolution

Amend spec 02: the operators become `<=`, `>=`, `==`, `!=`, `in`. `=` is renamed `==`. `value` is a single level for the first four and a non-empty list of levels for `in`. Nothing persists constraints yet, so no data migration is needed.

## Resolution

Decision (product owner, 2026-10-15): accepted as proposed. Recorded in `specs/02b-domain-types-and-schemas-amendment.md` (the product owner chose the `02b` prefix) and implemented in commit `spec 02b: Hard-constraint operators`.
