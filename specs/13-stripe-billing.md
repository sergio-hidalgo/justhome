# Spec 13 — Stripe billing

Status: todo
Phase: 1 (Pack 5) · 2 (seller plans)
Depends on: 10, 12

## Goal

Buy Pack 5 once, subscribe to seller plans, manage billing — with entitlements written only by verified webhooks.

## Requirements

R-13.1 Products / prices (Stripe, EUR, VAT handled by Stripe Tax, prices tax-inclusive):

| product | type | price | env |
|---|---|---|---|
| Pack 5 (buyer) | one-off | €14.95 | `STRIPE_PRICE_PACK5` |
| Seller 5 (1–5 properties) | recurring monthly | €19.95 | `STRIPE_PRICE_SELLER5` |
| Seller Plus (6+ properties) | recurring monthly | €39.95 | `STRIPE_PRICE_SELLER_PLUS` |

R-13.2 `POST /api/billing/checkout {product}` → Stripe Checkout session (mode `payment` or `subscription`), `client_reference_id = user.id`, success/cancel URLs back to the originating route with `?checkout=success|cancel`. Anonymous users must sign up first (spec 10).

R-13.3 Pack 5 checkout requires explicit consent: checkbox "Solicito acceso inmediato y renuncio a mi derecho de desistimiento de 14 días" (EN equivalent), stored on the purchase (`consent_withdrawal_waiver_at`). Use Checkout `consent_collection` / custom text.

R-13.4 `POST /api/billing/portal` → Customer Portal session (cancel, update card, switch Seller 5 ↔ Plus with proration).

R-13.5 `POST /api/billing/webhook` (raw body, signature verified, idempotent by `event.id`):

| event | effect |
|---|---|
| checkout.session.completed (payment, pack5) | insert `purchases`, insert `buyer_packs` (expires_at = now + 6 months) |
| customer.subscription.created / updated | update `entitlements.seller_plan`, `subscription_status`, `current_period_end` |
| customer.subscription.deleted | `seller_plan = 'none'`, status `canceled` |
| invoice.payment_failed | status `past_due`; UI banner |
| charge.refunded (pack5) | expire that pack immediately |

R-13.6 Downgrade Plus → Seller 5 with > 5 active properties: allowed; extra properties (newest first) become `read_only` until the user archives some.

R-13.7 Test mode in dev/CI with Stripe CLI fixtures.

## Acceptance criteria

- AC-13.1 e2e (test mode): buy Pack 5 → `/api/me/entitlements` shows 5 slots, expiry ≈ 6 months.
- AC-13.2 Replaying the same webhook event twice creates one pack.
- AC-13.3 Invalid signature → 400, no DB change.
- AC-13.4 Subscription deleted → seller properties become read-only after period end (spec 09 cron).
- AC-13.5 Checkout for Pack 5 cannot complete without the waiver consent.

## Files

`apps/api/src/routes/billing.ts`, `apps/api/src/services/stripe.ts`, migration `0005_purchases_consent.sql`, tests.
