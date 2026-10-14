import { describe, expect, it } from 'vitest';
import type { SignalCatalogEntry } from './catalog.js';
import { canonicalEngineInput, engineInput, type EngineInput } from './engine-io.js';

/** Test-local market object (testing skill rule 6); figures are arbitrary. */
const prov = {
  level: 'national',
  sourceId: 'test-source',
  sourceUrl: 'https://example.test/source',
  asOf: '2026-01-01',
  confidence: 'low',
  note: null,
  assumed: true,
} as const;

const market = {
  negotiationMargin: { value: 0.05, ...prov, marginKind: 'listing_cut' },
  itpRate: { value: 0.07, ...prov },
  holdingCost: {
    A: { value: [100, 200], ...prov },
    B: { value: [700, 1400], ...prov },
    C: { value: [300, 700], ...prov },
  },
  domAdjustments: { value: [], ...prov },
  horizonMonths: { value: 6, ...prov },
  rentPerM2: { value: 12, ...prov },
};

const catalogEntry = (code: string): SignalCatalogEntry => ({
  code,
  role: 'buyer',
  appliesTo: 'seller',
  labelKey: `signal.${code}`,
  likelihood: { A: 0.5, B: 0.5, C: 0.5 },
  questionKeys: [],
  tier: 'free',
});

function input(over: Record<string, unknown> = {}) {
  return {
    me: {
      role: 'buyer',
      issues: ['price'],
      shapes: { price: { type: 'decreasing', worst: 300_000, best: 260_000 } },
      weights: { price: 1 },
      constraints: [],
      batna: { alternative: null, monthlyWaitCost: 800 },
    },
    other: {
      id: 'c1',
      label: 'Vendedor A',
      role: 'seller',
      answers: { habitualHome: 'unknown' },
      signals: [{ code: 'visit_empty', at: '2026-10-01' }],
      offers: [],
    },
    property: {
      ccaa: 'Andalucía',
      municipality: 'Granada',
      askingPrice: 280_000,
      daysOnMarket: 45,
      priceDropCount: 0,
    },
    market,
    catalog: [catalogEntry('visit_empty')],
    tier: 'free',
    ...over,
  };
}

describe('engine input', () => {
  it('AC-02.7 EngineInput without catalog fails validation', () => {
    const noCatalog: Record<string, unknown> = input();
    delete noCatalog.catalog;
    expect(engineInput.safeParse(noCatalog).success).toBe(false);
  });

  it('AC-02.7 EngineInput with catalog: [] passes (no signals logged)', () => {
    const other = { ...input().other, signals: [] };
    const r = engineInput.safeParse(input({ catalog: [], other }));
    expect(r.error).toBeUndefined();
  });

  it('AC-02.8 a signal whose code is not in catalog fails naming the code', () => {
    const r = engineInput.safeParse(input({ catalog: [catalogEntry('visit_furnished')] }));
    expect(r.success).toBe(false);
    const issue = r.error?.issues.find((i) => i.message.includes('visit_empty'));
    expect(issue?.message).toBe('unknown signal code: visit_empty');
    expect(issue?.path).toEqual(['other', 'signals', 0, 'code']);
  });

  it('R-02.5 other may be a known position (joint mode)', () => {
    const r = engineInput.safeParse(input({ other: { ...input().me, role: 'seller' } }));
    expect(r.error).toBeUndefined();
  });

  it('R-02.5 canonical form sorts catalog by code, so order does not matter', () => {
    const a = engineInput.parse(
      input({ catalog: [catalogEntry('visit_empty'), catalogEntry('a_first')] }),
    ) as EngineInput;
    const b = engineInput.parse(
      input({ catalog: [catalogEntry('a_first'), catalogEntry('visit_empty')] }),
    ) as EngineInput;
    expect(canonicalEngineInput(a)).toBe(canonicalEngineInput(b));
  });

  it('R-02.5 a changed catalog changes the canonical form', () => {
    const a = engineInput.parse(input()) as EngineInput;
    const b = engineInput.parse(
      input({ catalog: [{ ...catalogEntry('visit_empty'), marginDelta: 0.01 }] }),
    ) as EngineInput;
    expect(canonicalEngineInput(a)).not.toBe(canonicalEngineInput(b));
  });
});
