# Issue 009: Spec 04 leaves four own-BATNA rules open

Status: resolved
Found while implementing: spec 04
Affects specs: 04
Type: gap

## What happened

Spec 04 does not say:

1. What `batnaUtility` does when price is not an issue: `eurPerPoint` is then `undefined` (R-03.6), but R-04.2 divides by it.
2. How `alternativeExpiresInDays` compares with a horizon in months (R-04.5), and whether an alternative expiring exactly at a horizon still counts.
3. Where the A/B/C priors for the "unknown" seller row of R-04.3 come from. They are spec 05 model parameters, and spec 04 does not depend on spec 05.
4. Which wait cost applies to the seller form's `not_habitual` situation, which is not in the R-04.3 table.

## Expected

Each rule is defined, and no market number or spec 05 parameter is put into spec 04 code (Constitution §5, issue 001).

## Reproduce

1. Read spec 04 R-04.2, R-04.3, R-04.5 together with spec 03 R-03.6 and the seller form (`situation`) in `packages/schemas/src/forms.ts`.

## Proposed resolution

1. Without a price issue there is no decay in points (the BATNA stays flat), and the euro fields are omitted.
2. A month is 30 days (`DAYS_PER_MONTH` in `packages/engine/src/params.ts`). The alternative is replaced at a horizon when `alternativeExpiresInDays < months × 30`, so one expiring exactly at the horizon still counts.
3. `defaultWaitCost` takes the priors as an argument, and spec 05 supplies them.
4. `not_habitual` uses the "unknown" row. An investor's own cost goes in `monthlyOpportunityCost`.

## Resolution

Decision (product owner, 2026-10-16): all four accepted as proposed. Spec 04 (`Status: todo`) edited in place in commit `spec 04: Engine own BATNA and time decay`: R-04.2, R-04.3 and R-04.5 clarified, and **Files** updated to list `params.ts` and the shared fixture helper.
