import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { IssueKey, Package } from '@vivienda/schemas';
import freelance from '../../../fixtures/freelance.json' with { type: 'json' };
import housing from '../../../fixtures/housing.json' with { type: 'json' };
import {
  FREELANCE_KEYS,
  freelancePosition,
  housingBuyer,
  position,
} from '../test/fixture-positions.js';
import { eurosFor, eurPerPoint, tradeoffRate, utility, weightsFromSwing } from './utility.js';

const FC = { seed: 42, numRuns: 200 };

describe('utility', () => {
  it('AC-03.1 freelance: Ana = 45 and Empresa X = 65 for (10,000 €, 4 wk, 60 %)', () => {
    const pkg: Package = { price: 10_000, closingDays: 4, arrasPct: 60 };
    expect(utility(freelancePosition(freelance.me), pkg)).toBeCloseTo(45, 9);
    expect(utility(freelancePosition(freelance.other), pkg)).toBeCloseTo(65, 9);
  });

  it('AC-03.1 freelance shapes reproduce every fixture score (mapping guard)', () => {
    for (const side of [freelance.me, freelance.other]) {
      const p = freelancePosition(side);
      for (const [name, levels] of Object.entries(freelance.issues)) {
        const key = FREELANCE_KEYS[name]!;
        const only = position({ issues: [key], shapes: p.shapes, weights: { [key]: 1 } });
        levels.forEach((l, i) => {
          expect(utility(only, { [key]: l })).toBeCloseTo(side.scores[name]![i]!, 9);
        });
      }
    }
  });

  it('R-03.2 housing fixture: every ZOPA package scores the expected buyer utility', () => {
    for (const z of housing.expected.zopa) {
      const pkg = { price: z.price, closingDays: z.closingDays, costs: z.costs };
      expect(utility(housingBuyer, pkg), JSON.stringify(pkg)).toBeCloseTo(z.uMe, 9);
    }
  });

  it('R-03.2 an issue missing from the package throws', () => {
    expect(() => utility(housingBuyer, { price: 320_000, closingDays: 60 })).toThrow(
      /no level for issue: costs/,
    );
  });

  it('R-03.2 weights not summing to 1 (±1e-9) throw', () => {
    const p = { ...housingBuyer, weights: { price: 0.5, closingDays: 0.28, costs: 0.2 } };
    expect(() => utility(p, { price: 320_000, closingDays: 60, costs: 'split' })).toThrow(
      /weights must sum to 1/,
    );
  });

  it('AC-03.6 property: utility of any package is in [0, 100]', () => {
    const swing = fc
      .tuple(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
      )
      .filter((ps) => ps.some((p) => p > 0));
    const pkgArb = fc.record({
      price: fc.double({ min: 0, max: 2e6, noNaN: true }),
      closingDays: fc.integer({ min: -30, max: 400 }),
      costs: fc.constantFrom('buyer', 'split', 'seller'),
    });
    fc.assert(
      fc.property(swing, pkgArb, ([p, c, k], pkg) => {
        const p0 = {
          ...housingBuyer,
          weights: weightsFromSwing({ price: p, closingDays: c, costs: k }),
        };
        const u = utility(p0, pkg);
        return u >= 0 && u <= 100;
      }),
      FC,
    );
  });
});

describe('weightsFromSwing', () => {
  it('AC-03.4 {price:100, closingDays:50, costs:50} → 0.5 / 0.25 / 0.25', () => {
    expect(weightsFromSwing({ price: 100, closingDays: 50, costs: 50 })).toEqual({
      price: 0.5,
      closingDays: 0.25,
      costs: 0.25,
    });
  });

  it('R-03.5 weights sum to 1 (±1e-9) for any non-zero points', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 7, maxLength: 7 }),
        (ps) => {
          fc.pre(ps.some((p) => p > 0));
          const keys: IssueKey[] = [
            'price',
            'closingDays',
            'costs',
            'arrasPct',
            'mortgageContingency',
            'furniture',
            'rentBackDays',
          ];
          const w = weightsFromSwing(Object.fromEntries(keys.map((k, i) => [k, ps[i]!])));
          const sum = Object.values(w).reduce((a, x) => a + x, 0);
          return Math.abs(sum - 1) <= 1e-9;
        },
      ),
      FC,
    );
  });

  it('R-03.5 all-zero or out-of-range points throw', () => {
    expect(() => weightsFromSwing({ price: 0, costs: 0 })).toThrow(/above 0/);
    expect(() => weightsFromSwing({ price: 120 })).toThrow(/\[0, 100\]/);
    expect(() => weightsFromSwing({ price: -1, costs: 10 })).toThrow(/\[0, 100\]/);
  });
});

describe('euro equivalence', () => {
  it('AC-03.5 price 300k–340k with w_price 0.55 → eurPerPoint = 727.27 € (issue 008)', () => {
    expect(eurPerPoint(housingBuyer)).toBeCloseTo(40_000 / 55, 9);
    expect(eurPerPoint(housingBuyer)).toBeCloseTo(727.27, 2);
  });

  it('AC-03.5 one eurPerPoint of price moves total utility by exactly 1 point', () => {
    const base = { price: 320_000, closingDays: 60, costs: 'split' };
    const cheaper = { ...base, price: 320_000 - eurPerPoint(housingBuyer)! };
    expect(utility(housingBuyer, cheaper) - utility(housingBuyer, base)).toBeCloseTo(1, 9);
  });

  it('R-03.6 euro equivalents are omitted when price is not an issue', () => {
    const noPrice = position({
      issues: ['closingDays', 'costs'],
      shapes: housingBuyer.shapes,
      weights: { closingDays: 0.6, costs: 0.4 },
    });
    expect(eurPerPoint(noPrice)).toBeUndefined();
    expect(eurosFor(noPrice, 'costs', 'buyer', 'seller')).toBeUndefined();
  });

  it('R-03.7 eurosFor(price) equals the price change itself', () => {
    expect(eurosFor(housingBuyer, 'price', 330_000, 320_000)).toBeCloseTo(10_000, 6);
    expect(eurosFor(housingBuyer, 'price', 320_000, 330_000)).toBeCloseTo(-10_000, 6);
  });

  it('R-03.7 eurosFor(costs buyer → seller) = 0.2 · 100 · eurPerPoint', () => {
    expect(eurosFor(housingBuyer, 'costs', 'buyer', 'seller')).toBeCloseTo(20 * (40_000 / 55), 6);
  });

  it('R-03.7 trade-off rate = (w_a · Δu_a) / (w_b · Δu_b)', () => {
    // costs buyer → seller: 0.2 · 100 = 20; closingDays 90 → 30: 0.25 · 100 = 25
    const rate = tradeoffRate(
      housingBuyer,
      { issue: 'costs', from: 'buyer', to: 'seller' },
      { issue: 'closingDays', from: 90, to: 30 },
    );
    expect(rate).toBeCloseTo(0.8, 12);
    expect(() =>
      tradeoffRate(
        housingBuyer,
        { issue: 'costs', from: 'buyer', to: 'seller' },
        { issue: 'closingDays', from: 60, to: 60 },
      ),
    ).toThrow(/has no value/);
  });
});
