import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDINAL_SCORES, WEIGHT_PRESETS } from './presets.js';

describe('presets', () => {
  it('R-03.4 weight presets match the spec table', () => {
    expect(WEIGHT_PRESETS).toEqual({
      price_first: { price: 0.6, closingDays: 0.2, costs: 0.2 },
      speed_first: { price: 0.35, closingDays: 0.45, costs: 0.2 },
      balanced: { price: 0.45, closingDays: 0.3, costs: 0.25 },
    });
  });

  it('R-03.4 every preset sums to 1 (±1e-9)', () => {
    for (const [name, w] of Object.entries(WEIGHT_PRESETS)) {
      const sum = Object.values(w).reduce((a, x) => a + x, 0);
      expect(Math.abs(sum - 1), name).toBeLessThanOrEqual(1e-9);
    }
  });

  it('R-03.8 default ordinal tables match the spec table', () => {
    expect(DEFAULT_ORDINAL_SCORES).toEqual({
      buyer: {
        costs: { buyer: 0, split: 50, seller: 100 },
        mortgageContingency: { no: 0, yes: 100 },
        furniture: { none: 0, partial: 50, all: 100 },
      },
      seller: {
        costs: { buyer: 100, split: 50, seller: 0 },
        mortgageContingency: { no: 100, yes: 0 },
        furniture: { none: 100, partial: 50, all: 0 },
      },
    });
  });
});
