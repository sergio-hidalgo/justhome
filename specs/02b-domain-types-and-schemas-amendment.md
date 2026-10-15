# Spec 02b — Amendment: hard-constraint operators

Status: done
Amends: 02
Phase: 0
Motivated by: issue 007

## Change

R-02.3 `HardConstraint` becomes:

```ts
type HardConstraint =
  | { issue: IssueKey; op: '<=' | '>=' | '==' | '!='; value: number | string }
  | { issue: IssueKey; op: 'in'; value: (number | string)[] }; // non-empty
```

- `=` is renamed `==`; `!=` and `in` are added (matches spec 03 R-03.3).
- The same operators apply to the `constraints` field of `buyerPrioritiesStep` and `sellerPrioritiesStep` (R-02.6), with levels in API units (price in cents).
- Every field keeps a description (R-02.9).

## Acceptance criteria

- AC-02b.1 `hardConstraint` accepts each of `<=`, `>=`, `==`, `!=` with a single value, and `in` with a non-empty list.
- AC-02b.2 `hardConstraint` rejects `=`, `in` with a single value, `in` with an empty list, and a scalar operator with a list.
- AC-02b.3 The priorities form step accepts the same operators.

## Files

`packages/schemas/src/{position,forms}.ts`, tests alongside.
