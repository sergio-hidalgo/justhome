import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { ISSUE_KEYS } from './issues.js';
import { buyerPrioritiesStep, buyerPropertyStep, buyerSellerStep, formSchemas } from './forms.js';

type Def = {
  type: string;
  shape?: Record<string, z.ZodType>;
  innerType?: z.ZodType;
  in?: z.ZodType;
};
const def = (s: z.ZodType) => (s as unknown as { _zod: { def: Def } })._zod.def;

function unwrap(s: z.ZodType): z.ZodType {
  const d = def(s);
  if (d.innerType) return unwrap(d.innerType);
  if (d.type === 'pipe' && d.in) return unwrap(d.in);
  return s;
}

/** Every enum field reachable through objects (question fields), with its path. */
function enumFields(s: z.ZodType, path = ''): [string, readonly string[]][] {
  const u = unwrap(s);
  const d = def(u);
  if (d.type === 'enum') return [[path, (u as unknown as { options: string[] }).options]];
  if (d.type === 'object' && d.shape) {
    return Object.entries(d.shape).flatMap(([k, v]) => enumFields(v, path ? `${path}.${k}` : k));
  }
  return [];
}

const allVariants = Object.entries(formSchemas).flatMap(([name, v]) => [
  [`${name}.free`, v.free] as const,
  [`${name}.paid`, v.paid] as const,
]);

describe('form schemas', () => {
  it('R-02.6 every form schema exports free and paid variants', () => {
    expect(Object.keys(formSchemas)).toHaveLength(9);
    for (const [name, s] of allVariants) expect(s, name).toBeDefined();
  });

  it("AC-02.4 every enum field in form schemas accepts 'unknown'", () => {
    let count = 0;
    for (const [name, s] of allVariants) {
      for (const [path, options] of enumFields(s)) {
        count++;
        expect(options, `${name} ${path}`).toContain('unknown');
      }
    }
    expect(count).toBeGreaterThan(10);
  });

  it("AC-02.4 'No lo sé' answers parse", () => {
    const r = buyerSellerStep.free.safeParse({
      habitualHome: 'unknown',
      occupancy: 'unknown',
      inHurry: 'unknown',
    });
    expect(r.success).toBe(true);
  });

  it('AC-02.3 free buyerPrioritiesStep rejects any issue outside price/closingDays/costs', () => {
    const ok = buyerPrioritiesStep.free.safeParse({
      issues: ['price', 'closingDays', 'costs'],
      weightProfile: 'balanced',
    });
    expect(ok.success).toBe(true);
    for (const issue of ISSUE_KEYS.filter((k) => !['price', 'closingDays', 'costs'].includes(k))) {
      const r = buyerPrioritiesStep.free.safeParse({
        issues: ['price', issue],
        weightProfile: 'balanced',
      });
      expect(r.success, issue).toBe(false);
    }
  });

  it('R-02.6 listingUrl accepts only http(s)', () => {
    const base = {
      ccaa: 'Andalucía',
      municipality: 'Granada',
      askingPriceCents: 28_000_000,
      daysOnMarket: 10,
      priceDropCount: 0,
    };
    const parse = (listingUrl: string) =>
      buyerPropertyStep.paid.safeParse({ ...base, listingUrl }).success;
    expect(parse('https://example.test/listing/1')).toBe(true);
    expect(parse('javascript:alert(1)')).toBe(false);
    expect(parse('ftp://example.test/x')).toBe(false);
  });

  it('AC-02.3 paid buyerPrioritiesStep accepts every issue', () => {
    const r = buyerPrioritiesStep.paid.safeParse({
      issues: [...ISSUE_KEYS],
      ranges: { price: { worst: 32_000_000, best: 28_000_000 } },
      constraints: [],
      weights: Object.fromEntries(ISSUE_KEYS.map((k) => [k, 1 / ISSUE_KEYS.length])),
    });
    expect(r.error).toBeUndefined();
  });
});
