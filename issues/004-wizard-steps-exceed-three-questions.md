# Issue 004: Wizard steps exceed the "≤ 3 questions per moment" principle

Status: resolved
Found while implementing: pre-implementation review (specs 16, 17)
Affects specs: 15, 16, 17
Type: product-decision-needed

## What happened

Constitution §2.3: "Progressive profiling. ≤ 3 questions per moment; taps over typing". Spec 16 R-16.1 step 1 (free) has five fields (CCAA, municipality, asking price, days on market or listing date, price drops), and the paid column adds more. Spec 17 R-17.1 step 2 has situation, several holding costs, deadline, best alternative and tax hints — well above three.

It is unclear whether "question" means any form field, or only profiling questions about the user's position and the counterpart (property facts being data entry).

## Expected

A definition that lets a reviewer (`constitution-check`) pass or fail a wizard step objectively.

## Reproduce

1. Count the fields of spec 16 step 1 and spec 17 step 2 against Constitution §2.3.

## Proposed resolution

- **A (recommended):** the limit applies per *screen of profiling questions about position and counterpart*; property facts (location, price, dates, size) are data entry and exempt. Steps 2–4 of spec 16 already respect ≤ 3. Spec 17 step 2 should be split into two screens (situation + deadline; costs + alternative + tax hints).
- **B:** the limit is literal for every wizard step: split every step into sub-screens of ≤ 3 fields. More screens, more friction on the free funnel.
- **C:** keep the specs as written and relax §2.3 to "≤ 3 questions per moment *in follow-ups* (extra-info, signals)".

## Resolution

Decision (product owner, 2026-10-12): **option A**.

- The ≤ 3 limit applies per screen of profiling questions about the user's position and the counterpart.
- Property facts (location, price, dates, size) are data entry and exempt.
- Spec 16 free-tier screens need no change; the paid screens do (see addendum).
- Spec 17 step 2 is split into two screens: (situation + deadline) and (costs + alternative + tax hints).

Spec 17 step 2 is done: `specs/17-seller-ui-amendment.md`.

### Addendum — correction (found while writing the amendment)

The statement above that "spec 16 needs no change (steps 2–4 already comply)" is **wrong for the paid tier**, and spec 17 has one more screen over the limit:

| screen                              | question groups                                      | over by |
|-------------------------------------|------------------------------------------------------|---------|
| Spec 16 step 2, paid                | max budget, monthly rent, best alternative, +        | 2       |
|                                     | lease end date, financing (pre-approved, amount,     |         |
|                                     | cash %)                                              |         |
| Spec 16 step 3, paid                | choose issues, worst/best per issue, hard            | 1       |
|                                     | constraints, swing weights                           |         |
| Spec 17 step 4 (now 5), first offer | buyer label, package, + 5 quick buyer answers        | 4       |
|                                     | (renting?, lease ends soon?, pre-approval shown?,    |         |
|                                     | cash?, first-time buyer?)                            |         |

Proposed (same rule as option A, applied consistently):

- Spec 16 step 2 → 2a (free fields: budget, rent, alternative) and 2b (paid: lease end, financing).
- Spec 16 step 3 → 3a (issues + worst/best) and 3b (hard constraints + swing weights).
- Spec 17 step 5 → 5a (buyer label, package) and 5b/5c (quick answers as two groups: current housing — renting?, lease ends soon?; financing and profile — pre-approval shown?, cash?, first-time buyer?).

Decision (product owner, 2026-10-12): split all three, as proposed. Applying the same rule consistently also splits spec 17's priorities step (issues + worst/best, then constraints + weights), which had the same four groups as spec 16's paid step 3. Resolved by:

- `specs/15-web-shell-routing-i18n-amendment.md` — `<SchemaForm fields>` so one step schema can render across screens;
- `specs/16-buyer-ui-amendment.md` — free wizard 4 screens, paid wizard 6;
- `specs/17-seller-ui-amendment.md` — seller wizard 5 screens, 8 with a first offer.
