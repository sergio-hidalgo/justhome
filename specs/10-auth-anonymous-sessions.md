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

R-10.8 **Protection against automated use (D-17).** The free tier must not become a free analysis service for bots or AI agents:

- Anonymous sign-in requires a CAPTCHA token (Supabase Auth CAPTCHA with Cloudflare Turnstile, `[auth.captcha]` in `config.toml`; site key `PUBLIC_TURNSTILE_SITE_KEY`, secret in the Supabase project settings). The widget runs in managed (mostly invisible) mode inside the wizard's first screen, so people rarely see a challenge.
- Supabase rate limit for anonymous sign-ins: 5 per hour per IP (`[auth.rate_limit] anonymous_users`).
- The API caps analyses by anonymous users at 20 per IP per day (R-11.5) and returns 429 `rate_limited` beyond it.
- The terms of use (linked in the footer and accepted implicitly at anonymous start, explicitly at sign-up) forbid automated access, scraping of the app and reselling of results.
- Signed-in paid users are not challenged again; their limits are their plan's.

## Acceptance criteria

- AC-10.1 e2e: anonymous visitor creates a buyer property, signs up, property still listed and owned.
- AC-10.2 e2e: sign-up with an existing email → merge flow moves the property.
- AC-10.3 API request without token → 401; with anonymous token on a seller endpoint → 403 `account_required`.
- AC-10.4 Seller CTA without session opens sign-in, then the seller modal.
- AC-10.5 Anonymous sign-in without a valid CAPTCHA token fails (Supabase test with the Turnstile test secret that always fails).
- AC-10.6 The 6th anonymous sign-in from one IP within an hour is rejected.

## Files

`apps/api/src/plugins/auth.ts`, `apps/api/src/routes/account.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/islands/{AuthModal,Captcha}.tsx`, `supabase/config.toml`, `apps/web/.env.example` (`PUBLIC_TURNSTILE_SITE_KEY`), tests.
