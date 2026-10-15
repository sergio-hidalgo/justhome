import { describe, expect, it } from 'vitest';
import type { HardConstraint, Package } from '@vivienda/schemas';
import { satisfies } from './constraints.js';

const pkg: Package = { price: 320_000, closingDays: 60, costs: 'split' };
const ok = (c: HardConstraint) => satisfies([c], pkg);

describe('satisfies', () => {
  it('R-03.3 <= and >= compare numeric levels', () => {
    expect(ok({ issue: 'price', op: '<=', value: 320_000 })).toBe(true);
    expect(ok({ issue: 'price', op: '<=', value: 319_999 })).toBe(false);
    expect(ok({ issue: 'closingDays', op: '>=', value: 60 })).toBe(true);
    expect(ok({ issue: 'closingDays', op: '>=', value: 61 })).toBe(false);
  });

  it('R-03.3 == and != compare numbers and level ids', () => {
    expect(ok({ issue: 'costs', op: '==', value: 'split' })).toBe(true);
    expect(ok({ issue: 'costs', op: '==', value: 'seller' })).toBe(false);
    expect(ok({ issue: 'costs', op: '!=', value: 'buyer' })).toBe(true);
    expect(ok({ issue: 'closingDays', op: '!=', value: 60 })).toBe(false);
  });

  it('R-03.3 in checks membership', () => {
    expect(ok({ issue: 'costs', op: 'in', value: ['split', 'seller'] })).toBe(true);
    expect(ok({ issue: 'costs', op: 'in', value: ['buyer'] })).toBe(false);
    expect(ok({ issue: 'closingDays', op: 'in', value: [30, 60, 90] })).toBe(true);
  });

  it('R-03.3 all constraints must hold; none means satisfied', () => {
    expect(satisfies([], pkg)).toBe(true);
    expect(
      satisfies(
        [
          { issue: 'price', op: '<=', value: 330_000 },
          { issue: 'costs', op: '!=', value: 'split' },
        ],
        pkg,
      ),
    ).toBe(false);
  });

  it('R-03.3 ordering on a level id or a missing issue throws', () => {
    expect(() => ok({ issue: 'costs', op: '<=', value: 'split' })).toThrow(TypeError);
    expect(() => ok({ issue: 'furniture', op: '==', value: 'all' })).toThrow(/no level/);
  });
});
