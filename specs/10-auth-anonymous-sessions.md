# Spec 10 — Auth and anonymous sessions

Status: todo
Phase: 1
Depends on: 01, 09

## Goal

Every visitor who starts a buyer analysis gets an anonymous Supabase session silently; sign-up or sign-in converts it without losing the property. Sellers must sign in before their first form.

## Requirements

R-10.1 Providers: email magic link, email + password, Google OAuth, anonymous sign-in (enabled in `config.toml`).
R-10.2 Web: when the buyer clicks "Analizar una vivienda" with no session, call `signInAnonymously()` before opening the modal.
R-10.3 Upgrade: on sign-up from an anonymous session, use `updateUser` / identity linking so `auth.uid()` is preserved. If the email already belongs to an account, offer "sign in and move this property" → API `POST /api/account/merge-anonymous` (service role) re-owns the anonymous property, if the target account has a free slot; otherwise it stays in a "pending" state shown in the list with a prompt to buy a pack.
R-10.4 Seller: `/vendedor` CTA → if no non-anonymous session, open sign-in modal; after sign-in, open the seller form modal.
R-10.5 API auth: Fastify plugin verifies the Supabase JWT (`Authorization: Bearer`), exposes `req.user = { id, isAnonymous }`; every DB call from the API uses a per-request Supabase client with the user's JWT so RLS applies. Service role only in webhook, merge and joint modules.
R-10.6 On first authenticated request, upsert `profiles` and `entitlements` rows.
R-10.7 Anonymous sessions older than 30 days with no activity are cleaned by a scheduled job (properties deleted).

## Acceptance criteria

- AC-10.1 e2e: anonymous visitor creates a buyer property, signs up, property still listed and owned.
- AC-10.2 e2e: sign-up with an existing email → merge flow moves the property.
- AC-10.3 API request without token → 401; with anonymous token on a seller endpoint → 403 `account_required`.
- AC-10.4 Seller CTA without session opens sign-in, then the seller modal.

## Files

`apps/api/src/plugins/auth.ts`, `apps/api/src/routes/account.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/islands/AuthModal.tsx`, `supabase/config.toml`, tests.
