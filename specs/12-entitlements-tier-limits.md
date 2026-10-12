# Spec 12 — Entitlements and tier limits

Status: todo
Phase: 1
Depends on: 09, 11

## Goal

One module decides what each user may do, used by every API route and mirrored by DB triggers.

## Requirements

R-12.1 `getEntitlements(userId) → Entitlements`:

```ts
interface Entitlements {
  buyerTier: 'free' | 'paid';
  buyerSlots: { total: number; used: number; available: number; nextExpiry?: string };
  sellerPlan: 'none' | 'seller5' | 'seller_plus';
  sellerActive: boolean;           // subscription active or trialing
  sellerFreeAnalysisAvailable: boolean;
  sellerPropertyLimit: number | null;
  canExport: boolean;
}
```

R-12.2 Rules (constitution D-01…D-07):

| capability | anonymous buyer | paid buyer (≥1 non-expired pack) | seller plan none | seller5 | seller_plus |
|---|---|---|---|---|---|
| create property | 1 total | slots available | 1, if free analysis unused | ≤ 5 active | ≤ cap |
| issues | 3 fixed | all 7 | all 7 (preview) | all 7 | all 7 |
| weights | presets | swing | swing | swing | swing |
| signals per property | 3, free-tier codes only | unlimited | unlimited | unlimited | unlimited |
| analyses | unlimited, tier free | unlimited, tier paid | **1** (tier paid) | unlimited | unlimited |
| history / export | ✗ | ✔ | ✗ | ✔ | ✔ |
| counterparts per property | 1 | 1 | 1 | unlimited | unlimited |

A paid buyer whose packs all expired is treated as `free` for new properties but keeps read access to existing ones.

R-12.3 Seller first free analysis: on the first successful `/analyze` by a seller with plan `none`, set `seller_free_analysis_used = true` in the same transaction. Later calls → 402 `plan_required` with the plans payload.

R-12.4 Tier passed to the engine: `free` for anonymous buyers and expired-pack-only buyers; `paid` otherwise.

R-12.5 `GET /api/me/entitlements` returns the object for the UI.

R-12.6 Pricing constants come from env / Stripe price IDs, never hard-coded in UI: Pack 5 €14.95, Seller 5 €19.95/mo, Seller Plus €39.95/mo (for display, fetched from Stripe and cached 1 h).

## Acceptance criteria

- AC-12.1 Table-driven test covering every cell of R-12.2.
- AC-12.2 Seller second analysis without plan → 402 `plan_required`.
- AC-12.3 Pack bought 6 months + 1 day ago → `available = 0` and existing properties read-only.
- AC-12.4 Two packs → 10 slots; archiving one property leaves `available` unchanged.

## Files

`apps/api/src/services/entitlements.ts`, `apps/api/src/routes/me.ts`, tests.
