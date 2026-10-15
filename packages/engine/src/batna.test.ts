import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { MarketReference, OwnBatnaInput, Position } from '@vivienda/schemas';
import freelance from '../../../fixtures/freelance.json' with { type: 'json' };
import housing from '../../../fixtures/housing.json' with { type: 'json' };
import {
  freelancePackage,
  freelancePosition,
  housingBuyer,
  housingSeller,
  position,
} from '../test/fixture-positions.js';
import { batnaUtility, defaultWaitCost, ownBatna } from './batna.js';
import { eurPerPoint } from './utility.js';

const FC = { seed: 42, numRuns: 200 };

/** Test-local market object; figures are made up and never come from engine code. */
function holdingRange(low: number, high: number) {
  return {
    value: [low, high] as [number, number],
    level: 'national' as const,
    sourceId: 'test',
    sourceUrl: 'test://market',
    asOf: '2026-01-01',
    confidence: 'low' as const,
    note: null,
    assumed: false,
  };
}
const market: Pick<MarketReference, 'holdingCost'> = {
  holdingCost: {
    A: holdingRange(100, 200),
    B: holdingRange(800, 1_200),
    C: holdingRange(500, 700),
  },
};

/** Seller with a price range giving eurPerPoint = 10,000 / (100 · 0.5) = 200 €. */
function sellerB(batna: OwnBatnaInput): Position {
  return position({
    role: 'seller',
    issues: ['price', 'closingDays'],
    shapes: {
      price: { type: 'increasing', worst: 300_000, best: 310_000 },
      closingDays: { type: 'increasing', worst: 30, best: 90 },
    },
    weights: { price: 0.5, closingDays: 0.5 },
    batna,
  });
}

const statusQuo = { price: 300_000, closingDays: 30 }; // U = 0
const alternative = { price: 310_000, closingDays: 90 }; // U = 100

describe('batnaUtility', () => {
  it('AC-04.1 freelance fixture: Ana = 32.5, Empresa X = 52.5 (months = 0)', () => {
    for (const side of [freelance.me, freelance.other]) {
      const input = { alternative: freelancePackage(side.batnaPackage), monthlyWaitCost: 0 };
      expect(batnaUtility(freelancePosition(side), input)).toBeCloseTo(side.batnaUtility, 9);
    }
    expect(freelance.me.batnaUtility).toBe(32.5);
    expect(freelance.other.batnaUtility).toBe(52.5);
  });

  it('AC-04.2 housing fixture: buyer Ana = 41.25, seller Carlos = 26.25', () => {
    const ana = { alternative: housing.me.batnaPackage, monthlyWaitCost: 0 };
    const carlos = { alternative: housing.other.batnaPackage, monthlyWaitCost: 0 };
    expect(batnaUtility(housingBuyer, ana)).toBeCloseTo(41.25, 9);
    expect(batnaUtility(housingSeller, carlos)).toBeCloseTo(26.25, 9);
  });

  it('AC-04.3 seller B, 1,000 €/month, eurPerPoint 200: BATNA falls 5 points per month', () => {
    const waitCost = defaultWaitCost({ kind: 'seller', scenario: 'B' }, market).mid;
    expect(waitCost).toBe(1_000);
    const p = sellerB({ alternative, monthlyWaitCost: waitCost });
    expect(eurPerPoint(p)).toBeCloseTo(200, 9);
    for (const months of [0, 1, 2, 3, 6]) {
      expect(batnaUtility(p, p.batna, months)).toBeCloseTo(100 - 5 * months, 9);
    }
    const out = ownBatna(p);
    expect(out.decayPerMonthEur).toBe(1_000);
    expect(out.decayPerMonthPoints).toBeCloseTo(5, 9);
  });

  it('AC-04.4 BATNA never negative, even when wait costs exceed it', () => {
    const p = sellerB({ alternative: { price: 302_000, closingDays: 30 }, monthlyWaitCost: 5_000 });
    expect(batnaUtility(p, p.batna, 6)).toBe(0);
    expect(ownBatna(p).horizons.map((h) => h.points)).toEqual([0, 0, 0]);
  });

  it('AC-04.4 property: BATNA is in [0, 100] for any package, costs and horizon', () => {
    const arb = fc.record({
      price: fc.double({ min: 250_000, max: 360_000, noNaN: true }),
      closingDays: fc.integer({ min: 0, max: 120 }),
      wait: fc.double({ min: 0, max: 20_000, noNaN: true }),
      opportunity: fc.double({ min: 0, max: 20_000, noNaN: true }),
      months: fc.double({ min: 0, max: 24, noNaN: true }),
    });
    fc.assert(
      fc.property(arb, ({ price, closingDays, wait, opportunity, months }) => {
        const p = sellerB({
          alternative: { price, closingDays },
          monthlyWaitCost: wait,
          monthlyOpportunityCost: opportunity,
        });
        const b = batnaUtility(p, p.batna, months);
        return b >= 0 && b <= 100;
      }),
      FC,
    );
  });

  it('AC-04.5 an alternative expiring in 45 days is replaced by status quo at 3 months', () => {
    const p = sellerB({ alternative, statusQuo, monthlyWaitCost: 0, alternativeExpiresInDays: 45 });
    expect(batnaUtility(p, p.batna, 0)).toBe(100);
    expect(batnaUtility(p, p.batna, 1)).toBe(100); // day 30: still available
    expect(batnaUtility(p, p.batna, 3)).toBe(0); // day 90: status quo
    expect(ownBatna(p).horizons.map((h) => h.points)).toEqual([100, 0, 0]);
  });

  it('R-04.5 an alternative expiring exactly at a horizon is still available there', () => {
    const p = sellerB({ alternative, statusQuo, monthlyWaitCost: 0, alternativeExpiresInDays: 90 });
    expect(batnaUtility(p, p.batna, 3)).toBe(100);
    expect(batnaUtility(p, p.batna, 6)).toBe(0);
  });

  it('R-04.2 a null alternative uses the status quo; with neither, the base is 0', () => {
    const half = { price: 305_000, closingDays: 60 }; // U = 50
    const withQuo = sellerB({ alternative: null, statusQuo: half, monthlyWaitCost: 0 });
    expect(batnaUtility(withQuo, withQuo.batna)).toBeCloseTo(50, 9);
    const neither = sellerB({ alternative: null, monthlyWaitCost: 400 });
    expect(batnaUtility(neither, neither.batna, 3)).toBe(0);
  });

  it('R-04.2 opportunity cost adds to wait cost', () => {
    const p = sellerB({ alternative, monthlyWaitCost: 600, monthlyOpportunityCost: 400 });
    expect(batnaUtility(p, p.batna, 2)).toBeCloseTo(90, 9);
  });

  it('R-04.2 negative or non-finite months throw', () => {
    const p = sellerB({ alternative, monthlyWaitCost: 0 });
    expect(() => batnaUtility(p, p.batna, -1)).toThrow(/non-negative/);
    expect(() => batnaUtility(p, p.batna, Number.NaN)).toThrow(/non-negative/);
  });
});

describe('ownBatna', () => {
  it('R-04.4 output has today, horizons 1/3/6 and decay, in points and euros', () => {
    const p = sellerB({ alternative, monthlyWaitCost: 1_000 });
    expect(ownBatna(p)).toEqual({
      today: { points: 100, eur: 20_000 },
      horizons: [
        { months: 1, points: expect.closeTo(95, 9), eur: expect.closeTo(19_000, 6) },
        { months: 3, points: expect.closeTo(85, 9), eur: expect.closeTo(17_000, 6) },
        { months: 6, points: expect.closeTo(70, 9), eur: expect.closeTo(14_000, 6) },
      ],
      decayPerMonthEur: 1_000,
      decayPerMonthPoints: expect.closeTo(5, 9),
    });
  });

  it('R-03.6 without a price issue euros are omitted and the BATNA does not decay', () => {
    const p = position({
      issues: ['closingDays'],
      shapes: { closingDays: { type: 'increasing', worst: 30, best: 90 } },
      weights: { closingDays: 1 },
      batna: { alternative: { closingDays: 60 }, monthlyWaitCost: 1_000 },
    });
    const out = ownBatna(p);
    expect(out.today).toEqual({ points: 50 });
    expect(out.horizons).toEqual([
      { months: 1, points: 50 },
      { months: 3, points: 50 },
      { months: 6, points: 50 },
    ]);
    expect(out.decayPerMonthEur).toBe(1_000);
    expect(out.decayPerMonthPoints).toBe(0);
  });
});

describe('defaultWaitCost', () => {
  it('R-04.3 buyer renting: the current rent', () => {
    expect(defaultWaitCost({ kind: 'renting', monthlyRentEur: 950 }, market)).toEqual({
      low: 950,
      high: 950,
      mid: 950,
    });
  });

  it('R-04.3 seller A/B/C: the market range, midpoint used', () => {
    expect(defaultWaitCost({ kind: 'seller', scenario: 'A' }, market)).toEqual({
      low: 100,
      high: 200,
      mid: 150,
    });
    expect(defaultWaitCost({ kind: 'seller', scenario: 'C' }, market).mid).toBe(600);
  });

  it('R-04.3 seller unknown: weighted mean of A/B/C by the supplied prior', () => {
    const r = defaultWaitCost(
      { kind: 'seller_unknown', priors: { A: 0.5, B: 0.25, C: 0.25 } },
      market,
    );
    expect(r.low).toBeCloseTo(0.5 * 100 + 0.25 * 800 + 0.25 * 500, 9);
    expect(r.high).toBeCloseTo(0.5 * 200 + 0.25 * 1_200 + 0.25 * 700, 9);
    expect(r.mid).toBeCloseTo((r.low + r.high) / 2, 9);
  });

  it('R-04.3 priors that do not sum to 1 or are negative throw', () => {
    const bad = (priors: { A: number; B: number; C: number }) => () =>
      defaultWaitCost({ kind: 'seller_unknown', priors }, market);
    expect(bad({ A: 0.5, B: 0.5, C: 0.5 })).toThrow(/sum to 1/);
    expect(bad({ A: 1.5, B: -0.5, C: 0 })).toThrow(/>= 0/);
  });
});
