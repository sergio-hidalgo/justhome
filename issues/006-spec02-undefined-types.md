# Issue 006: Spec 02 references types and tier rules it does not define

Status: resolved
Found while implementing: spec 02
Affects specs: 02, 04, 05, 06, 07, 16, 17, 19
Type: gap

## What happened

Spec 02 asks for schemas whose contents are not defined in spec 02 or in the specs it depends on:

1. `PropertyFacts` (in `EngineInput.property`) is not defined in any spec.
2. `KnownPosition` (in `EngineInput.other`) is only named in spec 19 ("the other side's real `Position`").
3. R-02.6 says form `free` variants contain "only fields marked F in the product doc". That document is not in the repo.
4. `EngineOutput` sections (BATNAs, estimate, metrics, packages, recommendation, lights, strategy) are defined in specs 04–07, which come later in the build order.
5. `MarketReference.domAdjustments`: spec 05 R-05.1 gives the table but no data shape.

## Expected

AGENTS.md: do not guess product rules; record the decision.

## Proposed resolution

Agreed with the product owner before implementing spec 02:

1. `PropertyFacts` = the property fields of spec 16/17 step 1, in engine units (euros, days): `ccaa`, `municipality`, `askingPrice`, `daysOnMarket`, `priceDropCount`, optional `priceDrops[]` (`daysAfterListing`, `amount`), `sizeM2`, `condition` (`resale` | `new`), `appraisal`.
2. `KnownPosition` = `Position` (alias).
3. Free/paid split taken from the step tables of spec 16 (buyer). Seller forms: the first free analysis is a full analysis (D-05, AC-17.1), so seller `free` equals `paid`. `signalLogEntry.free` omits `credibility` (the catalogue default applies).
4. `EngineOutput` defines the cross-cutting fields now (`engineVersion`, `inputsHash`, `marketProvenance`, `assumptions`, `limitations`, explanations as `{ key, params }`); the engine sections are typed `unknown` and get tightened by specs 04–07 when they are implemented.
5. `domAdjustments` = list of rules `{ daysMin, daysMax, dropsMin, dropsMax, earlyDropWithinDays, marginDelta }` (nulls = "any"); spec 05 may refine it.

## Resolution

Implemented as above in commit `spec 02: Domain types and shared schemas`.
