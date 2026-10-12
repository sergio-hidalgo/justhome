# Spec 15 — Amendment A: SchemaForm can render a subset of a step's fields

Status: accepted
Amends: spec 15 (R-15.5)
Source: `issues/004-wizard-steps-exceed-three-questions.md` (addendum) — needed by the 16 and 17 amendments
Applies: implement together with spec 15, in its commit. Where this file and spec 15 disagree, this file wins.

## Requirements

### R-15.A1 `fields` prop

`<SchemaForm schema step tier fields?>` takes an optional `fields: string[]` listing keys of the step schema.

- When given, only those fields are rendered, and validation on leaving the screen covers only them.
- Values of fields not rendered are preserved untouched in the value object that is passed in and out.
- Without `fields`, behaviour is exactly as specified in R-15.5.
- The full step schema is still validated at submit time by the caller.

## Acceptance criteria

- AC-15.7 Rendering with `fields` shows only those fields and validates only them.
- AC-15.8 Values of non-rendered fields are present and unchanged in the emitted value.

## Files

`apps/web/src/islands/SchemaForm.tsx` (and tests), as already covered by spec 15's `islands/**`.
