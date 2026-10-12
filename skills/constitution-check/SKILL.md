---
name: constitution-check
description: Callable skill — the product-rules review to run against a diff BEFORE declaring any spec done, especially specs that add or change user-facing copy, forms, dashboards, tiers, pricing, counterpart data or joint mode. Checks the diff against the Constitution's principles and decisions D-01…D-13. Pair with security-check. Treat every applicable item as blocking.
---

# Constitution check

`CONSTITUTION.md` is binding and wins over any spec. Run against YOUR DIFF and
report pass / fail / n-a per section in the task summary. A failure that the
spec itself mandates is not yours to fix silently — write an `issues/` file.

## 1. Principles

- [ ] **Decide, don't teach.** Each new screen or panel ends in a concrete
      action ("what should I do now with this property?"), not an explanation of
      game theory.
- [ ] **Estimates, never certainties.** Every counterpart figure shows a range
      (p10–p90) and a confidence level (low / medium / high), and the copy says
      "estimado" / "estimated". No counterpart number appears as a bare value.
- [ ] **Progressive profiling.** Question groups are kept small, answered by
      taps where possible, and every enum offers "No lo sé / I don't know" that
      keeps the prior. The ≤ 3 limit applies per screen of profiling questions
      about the user's position or the counterpart; property facts (location,
      price, dates, size) are exempt (issue 004). The screens are defined in
      `specs/16-buyer-ui-amendment.md` and `specs/17-seller-ui-amendment.md`;
      a screen with more than 3 question groups fails the review.
- [ ] **Non-manipulative.** Suggested scripts are questions to learn facts.
      Nothing suggests exploiting private hardship. No question asks for the
      counterpart's debts, mortgage balance, health or family situation beyond a
      coarse "reason for hurry".
- [ ] **Money first.** Utility points are shown next to their euro equivalent
      where a price issue exists; when the euro value is unavailable (e.g. no
      ITP rate) the issue is shown without one, not with a guess (R-14.6).
- [ ] **The engine is the product.** UI and API contain no scoring logic; the
      numbers displayed are the ones returned by `analyse()` (AC-16.5).
- [ ] **Functional UI first.** No design-system work, no engine/API change
      justified by visuals; copy and styling stay replaceable.
- [ ] **Privacy by design.** Counterparts are labels, never people; joint mode
      never reveals one side's private inputs to the other.

## 2. Decisions D-01 … D-13

- [ ] **D-01/D-03/D-04** Free buyer: anonymous, 1 property, 3 fixed issues,
      preset weights, ≤ 3 signals, confidence `low`, no history/export. A slot is
      consumed at creation; archiving never frees it; expired packs make
      properties read-only.
- [ ] **D-02** Pack 5 = one-off, 5 slots, expires 6 months after purchase, packs
      stack. Price shown comes from Stripe/env, never a literal in UI (R-12.6).
- [ ] **D-05/D-06/D-07** Seller needs an account from the start; first analysis
      free (one property, one run); Seller 5 / Seller Plus monthly; lapsed ⇒
      read-only.
- [ ] **D-08** API is the separate Fastify service; web does not reach the
      database for data (Supabase client in the browser is for auth only).
- [ ] **D-09** Market data comes from imported rows carrying `source_url` and
      `as_of`; values older than 12 months are flagged; `marketProvenance` is
      exposed; superseded figures (15 %, 35 %, 11 %) never appear.
- [ ] **D-10** Every new string exists in both `es.json` and `en.json` (same
      keys); routes are Spanish slugs with English aliases 301-redirecting.
- [ ] **D-11** Joint mode never changes either user's tier; discovery only by
      invite link or opt-in match with consent defaulting to off.
- [ ] **D-12** Property and position data entry happens in modals inside
      `/comprador` and `/vendedor`, not in separate routes.
- [ ] **D-13** Scope stays resale homes, individual buyers and sellers: nothing
      for new-build, agencies or commercial property.

## 3. Conventions and surfaces

- [ ] Money integer cents in DB/API; euros only inside the engine; formatted
      with `Intl.NumberFormat(locale, { currency: 'EUR' })` in UI.
- [ ] Dates ISO `YYYY-MM-DD`; IDs UUID v4; DB `snake_case`, TS `camelCase`.
- [ ] Every API response carrying engine output includes `engineVersion`.
- [ ] Feature flags `FLAG_JOINT_MODE` and `FLAG_EXPORT` gate their features end
      to end (route, UI entry points, nightly job).
- [ ] The footer and PDF carry: "Herramienta de apoyo a la decisión; no es
      asesoramiento legal, fiscal ni financiero" (and its EN equivalent), via
      i18n keys. Tax hints say "consulta con un gestor".
- [ ] Locked free-tier features are visible-but-locked with the upgrade path
      (`UpgradeSheet`), not hidden and not silently missing.
- [ ] Free-tier outputs are labelled as reduced accuracy; paid-only numbers
      are absent from the payload, not just hidden in the UI.
- [ ] Pack 5 purchase flow includes the withdrawal-waiver consent (R-13.3).

## 4. Reporting

For each failed item: the file/line, the rule (principle number or D-id), and
either the fix or the issue file. If the rule and the spec disagree, the
Constitution wins and an issue is opened — the spec is not edited in place.
