import { describe, expect, it } from 'vitest';
import { hardConstraint, position } from './position.js';

const base = {
  role: 'buyer',
  issues: ['price', 'closingDays', 'costs'],
  shapes: {
    price: { type: 'decreasing', worst: 320_000, best: 280_000 },
    closingDays: { type: 'peaked', worst: [15, 180], ideal: 60 },
    costs: { type: 'ordinal', scores: { buyer: 0, split: 50, seller: 100 } },
  },
  constraints: [{ issue: 'price', op: '<=', value: 320_000 }],
  batna: { alternative: null, monthlyWaitCost: 900 },
};

describe('position', () => {
  it('AC-02.2 weights summing to 0.98 fail validation', () => {
    const r = position.safeParse({
      ...base,
      weights: { price: 0.5, closingDays: 0.28, costs: 0.2 },
    });
    expect(r.success).toBe(false);
  });

  it('AC-02.2 weights summing to 1.0 ± 1e-9 pass', () => {
    for (const eps of [0, 0.99e-9, -0.99e-9, 5e-10]) {
      const r = position.safeParse({
        ...base,
        weights: { price: 0.5 + eps, closingDays: 0.3, costs: 0.2 },
      });
      expect(r.success, `eps=${eps}`).toBe(true);
    }
  });

  it('AC-02.2 weights off by more than 1e-9 fail', () => {
    const r = position.safeParse({
      ...base,
      weights: { price: 0.5 + 1e-8, closingDays: 0.3, costs: 0.2 },
    });
    expect(r.success).toBe(false);
  });
});

describe('hardConstraint (spec 02b)', () => {
  const ok = (c: unknown) => hardConstraint.safeParse(c).success;

  it('AC-02b.1 accepts <=, >=, ==, != with one level and in with a non-empty list', () => {
    for (const op of ['<=', '>=', '==', '!=']) {
      expect(ok({ issue: 'price', op, value: 320_000 }), op).toBe(true);
    }
    expect(ok({ issue: 'costs', op: '!=', value: 'buyer' })).toBe(true);
    expect(ok({ issue: 'costs', op: 'in', value: ['split', 'seller'] })).toBe(true);
    expect(ok({ issue: 'closingDays', op: 'in', value: [30, 60] })).toBe(true);
  });

  it('AC-02b.2 rejects =, in without a list, an empty in and a scalar op with a list', () => {
    expect(ok({ issue: 'price', op: '=', value: 320_000 })).toBe(false);
    expect(ok({ issue: 'costs', op: 'in', value: 'split' })).toBe(false);
    expect(ok({ issue: 'costs', op: 'in', value: [] })).toBe(false);
    expect(ok({ issue: 'price', op: '<=', value: [320_000] })).toBe(false);
  });
});
