# Issue 008: `eurPerPoint` formula contradicts its own use

Status: resolved
Found while implementing: spec 03
Affects specs: 03
Type: contradiction

## What happened

Spec 03 R-03.6 defines `eurPerPoint(position) = |price.best − price.worst| × w_price / 100` and AC-03.5 expects 220 € for a 300k–340k range with `w_price` 0.55.

The value is used as "euros per point of total utility U" in R-03.6 ("translate any utility gap into euros"), in R-03.7 (`eurosFor = w·Δu / (w_price · |∂u_price/∂€|)`) and in spec 04 R-04.2 (`U − cost / eurPerPoint`). For a linear price value function, one point of U is worth `|best − worst| / (100 × w_price)` euros: 40,000 / 55 = 727.27 €. Check: moving the price by 727.27 € changes U by 0.55 × 727.27 / 400 = 1.00 point. With 220 € it changes U by only 0.3025 points.

The two formulas in R-03.6 and R-03.7 therefore disagree by a factor of `w_price²`.

## Expected

One definition, consistent with R-03.7 and spec 04 (Constitution §2.5, "show utility points and their euro equivalent").

## Reproduce

1. Housing fixture: price 300k–340k, `w_price` 0.55.
2. Change the price by 220 € and recompute U: it moves 0.3025 points, not 1.

## Proposed resolution

`eurPerPoint(position) = |price.best − price.worst| / (100 × w_price)`; AC-03.5 expects 727.27 € (40,000 / 55). Spec 04 AC-04.3 gives `eurPerPoint` directly (200) and is unaffected.

## Resolution

Decision (product owner, 2026-10-15): accepted as proposed. Spec 03 (`Status: todo`) edited in place in commit `spec 03: Engine value functions and utility (MAUT)`. In the same edit, `eurosFor` takes the position as its first argument, and both functions return `undefined` when price is not an issue.
