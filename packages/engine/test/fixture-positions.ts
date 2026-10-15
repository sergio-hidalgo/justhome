import type { IssueKey, Package, Position, Shape } from '@vivienda/schemas';
import freelance from '../../../fixtures/freelance.json' with { type: 'json' };
import housing from '../../../fixtures/housing.json' with { type: 'json' };

/** Builds a Position with no constraints and an empty BATNA unless overridden. */
export function position(
  p: Pick<Position, 'issues' | 'shapes' | 'weights'> & Partial<Position>,
): Position {
  return { role: 'buyer', constraints: [], batna: { alternative: null, monthlyWaitCost: 0 }, ...p };
}

/**
 * The freelance fixture uses `weeks` and `upfrontPct`, which are not issue keys;
 * they are mapped onto numeric issues. Each fixture issue is linear in its levels,
 * so the shape is built from the levels scoring 0 and 100.
 */
export const FREELANCE_KEYS: Record<string, IssueKey> = {
  price: 'price',
  weeks: 'closingDays',
  upfrontPct: 'arrasPct',
};

type FreelanceSide = { weights: Record<string, number>; scores: Record<string, number[]> };

export function freelancePosition(side: FreelanceSide): Position {
  const shapes: Partial<Record<IssueKey, Shape>> = {};
  const weights: Partial<Record<IssueKey, number>> = {};
  for (const [name, levels] of Object.entries(freelance.issues)) {
    const key = FREELANCE_KEYS[name]!;
    const scores = side.scores[name]!;
    const worst = levels[scores.indexOf(0)]!;
    const best = levels[scores.indexOf(100)]!;
    shapes[key] = { type: best > worst ? 'increasing' : 'decreasing', worst, best };
    weights[key] = side.weights[name]!;
  }
  return position({ issues: Object.values(FREELANCE_KEYS), shapes, weights });
}

/** Maps a freelance fixture package (`weeks`, `upfrontPct`) onto issue keys. */
export function freelancePackage(raw: Record<string, number>): Package {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [FREELANCE_KEYS[k]!, v]));
}

export const housingBuyer = position({
  issues: ['price', 'closingDays', 'costs'],
  shapes: {
    price: { type: 'decreasing', worst: 340_000, best: 300_000 },
    closingDays: { type: 'decreasing', worst: 90, best: 30 },
    costs: { type: 'ordinal', scores: { buyer: 0, split: 50, seller: 100 } },
  },
  weights: housing.me.weights,
});

export const housingSeller = position({
  role: 'seller',
  issues: ['price', 'closingDays', 'costs'],
  shapes: {
    price: { type: 'increasing', worst: 300_000, best: 340_000 },
    closingDays: { type: 'increasing', worst: 30, best: 90 },
    costs: { type: 'ordinal', scores: { buyer: 100, split: 50, seller: 0 } },
  },
  weights: housing.other.weights,
});
