import { describe, expect, it } from 'vitest';
import { cents, fromEngine, toEngine } from './money.js';

describe('money', () => {
  it('AC-02.5 toEngine(fromEngine(x)) round-trips euro amounts exactly', () => {
    for (const eur of [0, 0.01, 0.1, 0.29, 1.005, 19.95, 249_999.99, 320_000, 1_234_567.89]) {
      const roundedToCent = Math.round(eur * 100) / 100;
      expect(toEngine(fromEngine(eur))).toBe(roundedToCent);
    }
  });

  it('AC-02.5 fromEngine(toEngine(c)) round-trips integer cents exactly', () => {
    for (let c = 0; c < 100_000; c += 7) {
      expect(fromEngine(toEngine(c))).toBe(c);
    }
    for (const c of [32_000_000, 99_999_999, 123_456_789_01]) {
      expect(fromEngine(toEngine(c))).toBe(c);
    }
  });

  it('R-02.7 cents rejects fractional amounts', () => {
    expect(cents.safeParse(12345).success).toBe(true);
    expect(cents.safeParse(123.45).success).toBe(false);
  });
});
