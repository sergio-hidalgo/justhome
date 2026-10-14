import { describe, expect, it } from 'vitest';
import { catalogFromRows, signalCatalogEntry, type SignalCatalogEntry } from './catalog.js';

/** Spec 05 R-05.3 seed table (test-local copy). Role/labels/tiers are test values. */
const L = (A: number, B: number, C: number) => ({ A, B, C });
const entry = (
  code: string,
  likelihood: SignalCatalogEntry['likelihood'],
  extra: Partial<SignalCatalogEntry> = {},
): SignalCatalogEntry => ({
  code,
  role: 'buyer',
  appliesTo: 'seller',
  labelKey: `signal.${code}`,
  likelihood,
  questionKeys: [],
  tier: 'paid',
  ...extra,
});

const SEED: SignalCatalogEntry[] = [
  entry('visit_furnished', L(0.85, 0.1, 0.7), { tier: 'free' }),
  entry('visit_empty', L(0.1, 0.85, 0.25), { tier: 'free' }),
  entry('visit_boxes', L(0.1, 0.7, 0.5)),
  entry('said_has_other_home', L(0.05, 0.9, 0.2)),
  entry('said_looking_nearby', L(0.5, 0.05, 0.8)),
  entry('seemed_hurried', L(0.2, 0.6, 0.5)),
  entry('price_drop', L(0.3, 0.6, 0.5), { marginDelta: 0.02 }),
  entry('mentions_other_offer', L(0.4, 0.4, 0.4), {
    batnaShift: { pct: 0.02, credibilityDefault: 0.5 },
  }),
  entry('asked_your_closing', L(0.3, 0.6, 0.7), { weightNudge: { closingDays: 0.1 } }),
  entry('hurry_reason_move_job', L(0.2, 0.5, 0.5)),
  entry('hurry_reason_buying', L(0.05, 0.6, 0.8)),
  entry('hurry_reason_inheritance_divorce', L(0.2, 0.5, 0.3)),
  entry('rejects_close_offer', L(0.7, 0.2, 0.4), { marginDelta: -0.02 }),
];

/** The same entries as `signal_catalog` rows (spec 09). */
function toRow(e: SignalCatalogEntry) {
  return {
    code: e.code,
    role: e.role,
    applies_to: e.appliesTo,
    label_key: e.labelKey,
    likelihood: e.likelihood,
    batna_shift: e.batnaShift
      ? { pct: e.batnaShift.pct, credibility_default: e.batnaShift.credibilityDefault }
      : null,
    weight_nudge: e.weightNudge ?? null,
    margin_delta: e.marginDelta ?? null,
    question_keys: e.questionKeys,
    tier: e.tier,
  };
}

describe('signal catalogue', () => {
  it('AC-02.6 signalCatalogEntry accepts every seed row', () => {
    expect(SEED).toHaveLength(13);
    for (const e of SEED) expect(signalCatalogEntry.safeParse(e).success, e.code).toBe(true);
  });

  it('AC-02.6 signalCatalogEntry rejects a likelihood outside [0, 1]', () => {
    for (const bad of [1.01, -0.01]) {
      const r = signalCatalogEntry.safeParse(entry('x', { A: bad, B: 0.5 }));
      expect(r.success).toBe(false);
    }
  });

  it('AC-02.9 catalogFromRows round-trips the seed rows to entries', () => {
    expect(catalogFromRows(SEED.map(toRow))).toEqual(SEED);
  });

  it('AC-02.9 catalogFromRows accepts numeric columns as strings', () => {
    const row = { ...toRow(SEED[6]!), margin_delta: '0.02' };
    expect(catalogFromRows([row])[0]?.marginDelta).toBe(0.02);
  });

  it('AC-02.9 catalogFromRows rejects a malformed likelihood', () => {
    const base = toRow(SEED[0]!);
    for (const likelihood of [{ A: 2 }, { A: 'high' }, { Z: 0.5 }, null, [0.1, 0.2]]) {
      expect(() => catalogFromRows([{ ...base, likelihood }])).toThrow();
    }
  });
});
