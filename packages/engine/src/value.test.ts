import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Shape } from '@vivienda/schemas';
import { valueOf } from './value.js';

const FC = { seed: 42, numRuns: 200 };

const level = fc.double({ min: -1e9, max: 1e9, noNaN: true });

const shapeArb: fc.Arbitrary<Shape> = fc.oneof(
  fc
    .tuple(level, level)
    .filter(([a, b]) => a !== b)
    .chain(([worst, best]) =>
      fc.constantFrom<Shape>(
        { type: 'increasing', worst: Math.min(worst, best), best: Math.max(worst, best) },
        { type: 'decreasing', worst: Math.max(worst, best), best: Math.min(worst, best) },
      ),
    ),
  fc
    .tuple(level, level, level)
    .map(([a, b, c]) => [a, b, c].sort((x, y) => x - y) as [number, number, number])
    .map(([lo, ideal, hi]): Shape => ({ type: 'peaked', worst: [lo, hi], ideal })),
);

describe('valueOf', () => {
  it('R-03.1 increasing: worst → 0, best → 100, linear between', () => {
    const s: Shape = { type: 'increasing', worst: 8_000, best: 12_000 };
    expect(valueOf(s, 8_000)).toBe(0);
    expect(valueOf(s, 10_000)).toBe(50);
    expect(valueOf(s, 12_000)).toBe(100);
  });

  it('R-03.1 decreasing: worst → 0, best → 100 with best < worst', () => {
    const s: Shape = { type: 'decreasing', worst: 340_000, best: 300_000 };
    expect(valueOf(s, 340_000)).toBe(0);
    expect(valueOf(s, 320_000)).toBe(50);
    expect(valueOf(s, 300_000)).toBe(100);
  });

  it('R-03.1 ordinal: looks up the score; an unknown level throws', () => {
    const s: Shape = { type: 'ordinal', scores: { buyer: 0, split: 50, seller: 100 } };
    expect(valueOf(s, 'split')).toBe(50);
    expect(() => valueOf(s, 'notary')).toThrow(/unknown ordinal level/);
  });

  it('R-03.1 numeric shapes reject string levels and degenerate ranges', () => {
    expect(() => valueOf({ type: 'increasing', worst: 0, best: 10 }, 'x')).toThrow(TypeError);
    expect(() => valueOf({ type: 'increasing', worst: 5, best: 5 }, 5)).toThrow(/degenerate/);
  });

  it('AC-03.2 peaked [15,180], ideal 60: 100 at 60, 0 at 15 and 180, 50 at 120', () => {
    const s: Shape = { type: 'peaked', worst: [15, 180], ideal: 60 };
    expect(valueOf(s, 60)).toBe(100);
    expect(valueOf(s, 15)).toBe(0);
    expect(valueOf(s, 180)).toBe(0);
    expect(valueOf(s, 120)).toBe(50);
  });

  it('AC-03.2 peaked with ideal on a range end does not divide by zero', () => {
    const s: Shape = { type: 'peaked', worst: [15, 180], ideal: 15 };
    expect(valueOf(s, 15)).toBe(100);
    expect(valueOf(s, 10)).toBe(0);
    expect(valueOf(s, 97.5)).toBe(50);
  });

  it('AC-03.3 values outside a range are clamped', () => {
    expect(valueOf({ type: 'increasing', worst: 0, best: 10 }, -5)).toBe(0);
    expect(valueOf({ type: 'increasing', worst: 0, best: 10 }, 50)).toBe(100);
    expect(valueOf({ type: 'decreasing', worst: 10, best: 0 }, -5)).toBe(100);
    expect(valueOf({ type: 'decreasing', worst: 10, best: 0 }, 50)).toBe(0);
    expect(valueOf({ type: 'peaked', worst: [15, 180], ideal: 60 }, 5)).toBe(0);
    expect(valueOf({ type: 'peaked', worst: [15, 180], ideal: 60 }, 365)).toBe(0);
  });

  it('AC-03.3 property: any shape and any level give a value in [0, 100]', () => {
    fc.assert(
      fc.property(shapeArb, level, (s, x) => {
        const v = valueOf(s, x);
        return v >= 0 && v <= 100;
      }),
      FC,
    );
  });
});
