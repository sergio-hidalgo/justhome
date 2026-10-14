# Spec 19 — Joint orchestration (buyer ↔ seller)

Status: todo
Phase: 3
Depends on: 06, 07, 11, 12, 15, 16, 17
Flag: `FLAG_JOINT_MODE`

## Goal

When the buyer and the seller of the same property are both on the platform, the app replaces estimates with each side's real inputs and proposes one package that beats both BATNAs, without revealing either side's private numbers and without changing either user's tier (D-11).

## Requirements

### R-19.1 Discovery (both routes, D-11)

1. **Invite**: either party clicks "Invitar a la otra parte" on their dashboard → one-time link (`/mesa/invite/<token>`, 14-day expiry). The receiver signs in (anonymous buyers are prompted to create a free account; tier unchanged) and picks which of their properties it refers to, or creates it.
2. **Match notification**: nightly job finds buyer and seller properties with the same `fingerprint_hash` where **both** owners have `consent_joint_notifications = true` and no session exists. Each receives an in-app notice: "Otra persona está negociando esta misma vivienda en la plataforma. ¿Queréis una propuesta coordinada?" No identity, no figures. Session starts only when both accept.
3. Users without consent are never matched or notified; the consent toggle lives in `/cuenta` and in the wizard's last step, off by default.

### R-19.2 Session lifecycle

`pending → active → proposed → (accepted | rejected | expired)`

- On activation both inputs are snapshotted; `locked_inputs_hash` stored.
- Either side may revise inputs; this resets to `active`, increments `recompute_count`, and both see "Datos revisados por una de las partes".
- `recompute_count` max 3; afterwards the session ends with the last proposal.

### R-19.3 Engine in joint mode

- `EngineInput.other` = the other side's real `Position` (`KnownPosition`), no Monte Carlo.
- Issue space = union of both sides' issues; for an issue only one side selected, the other side gets its role's default value table and weight 0.
- Output: ZOPA exists (bool), Nash package, KS package if different, each side's own surplus vs own BATNA. Tier of either user does not restrict the joint output.

### R-19.4 What each side sees (`/mesa/[sessionId]`)

| shown                                        | never shown                                       |
| -------------------------------------------- | ------------------------------------------------- |
| whether a ZOPA exists                        | other side's BATNA, weights, constraints, signals |
| 1–2 proposed packages                        | other side's surplus or pie share                 |
| my surplus vs my BATNA (points and €)        | which side's position blocks agreement            |
| widen hints if ZOPA empty (issue names only) |                                                   |

The API filters the response per viewer; a test asserts no field derived from the other side's position other than the proposed packages reaches the client.

### R-19.5 Sealed response

Each side answers accept / reject per proposed package without seeing the other's answer until both have answered or 7 days pass. Both accept → status `accepted` → downloadable summary (both locales) listing the agreed terms, stating it is **not binding** and should be formalised in arras / notary.

### R-19.6 Audit and privacy

- `joint_sessions` accessible only via API service role.
- Every session event logged (no input values).
- Users may leave a session at any time; their inputs are then deleted from the snapshot.

## Acceptance criteria

- AC-19.1 Two test accounts with the same catastral hash and consent on → both receive a notice; with one consent off → neither does.
- AC-19.2 Invite flow from buyer to seller creates an active session linked to both properties.
- AC-19.3 Joint result for the housing fixture as two known positions equals the golden Nash package.
- AC-19.4 Response-filter test: buyer's `/mesa` payload contains none of the seller's BATNA, weights or surplus.
- AC-19.5 4th recompute is refused with `recompute_limit`.
- AC-19.6 A free-tier buyer receives the full joint proposal; their entitlements are unchanged afterwards.

## Files

`apps/api/src/routes/joint.ts`, `apps/api/src/services/joint/**`, `apps/web/src/pages/mesa/**`, migration `0006_joint.sql`, tests.
