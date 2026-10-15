import type { IssueKey, Package, Position, Shape } from '@vivienda/schemas';
import { valueOf } from './value.js';

/** Weights must sum to 1 within this tolerance (Constitution §5). */
const WEIGHT_SUM_TOLERANCE = 1e-9;

type Level = number | string;

/** A level change on one issue, used by trade-off rates (R-03.7). */
export interface LevelChange {
  issue: IssueKey;
  from: Level;
  to: Level;
}

function weightOf(position: Position, issue: IssueKey): number {
  const w = position.weights[issue];
  if (w === undefined) throw new RangeError(`no weight for issue: ${issue}`);
  return w;
}

function shapeOf(position: Position, issue: IssueKey): Shape {
  const s = position.shapes[issue];
  if (s === undefined) throw new RangeError(`no value function for issue: ${issue}`);
  return s;
}

function assertWeights(position: Position): void {
  let sum = 0;
  for (const issue of position.issues) sum += weightOf(position, issue);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new RangeError(`weights must sum to 1 (±1e-9), got ${sum}`);
  }
}

/** Weighted value gain w·Δu of moving one issue from one level to another. */
function weightedGain(position: Position, c: LevelChange): number {
  const s = shapeOf(position, c.issue);
  return weightOf(position, c.issue) * (valueOf(s, c.to) - valueOf(s, c.from));
}

/** U(pkg) = Σ w_j · u_j(pkg_j) over `position.issues`, on [0, 100] (R-03.2). */
export function utility(position: Position, pkg: Package): number {
  assertWeights(position);
  let total = 0;
  for (const issue of position.issues) {
    const level = pkg[issue];
    if (level === undefined) throw new RangeError(`package has no level for issue: ${issue}`);
    total += weightOf(position, issue) * valueOf(shapeOf(position, issue), level);
  }
  return Math.min(100, Math.max(0, total));
}

/** Normalises swing points (0–100 per issue) to weights summing to 1 (R-03.5). */
export function weightsFromSwing(
  points: Partial<Record<IssueKey, number>>,
): Partial<Record<IssueKey, number>> {
  const entries = (Object.entries(points) as [IssueKey, number][]).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  let total = 0;
  for (const [issue, p] of entries) {
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      throw new RangeError(`swing points must be in [0, 100], got ${p} for ${issue}`);
    }
    total += p;
  }
  if (total === 0) throw new RangeError('at least one issue needs swing points above 0');
  return Object.fromEntries(entries.map(([issue, p]) => [issue, p / total]));
}

/**
 * Euros worth one point of total utility U: |price.best − price.worst| / (100 · w_price)
 * (R-03.6, issue 008). `undefined` when price is not an issue or has no weight.
 */
export function eurPerPoint(position: Position): number | undefined {
  if (!position.issues.includes('price')) return undefined;
  const w = weightOf(position, 'price');
  if (w === 0) return undefined;
  const s = shapeOf(position, 'price');
  if (s.type !== 'increasing' && s.type !== 'decreasing') {
    throw new RangeError(`price needs a monotone value function, got ${s.type}`);
  }
  return Math.abs(s.best - s.worst) / (100 * w);
}

/** Trade-off rate (w_a · Δu_a) / (w_b · Δu_b) between two level changes (R-03.7). */
export function tradeoffRate(position: Position, a: LevelChange, b: LevelChange): number {
  const denominator = weightedGain(position, b);
  if (denominator === 0) throw new RangeError(`level change on ${b.issue} has no value`);
  return weightedGain(position, a) / denominator;
}

/**
 * Euro equivalent w·Δu / (w_price · |∂u_price/∂€|) = w·Δu · eurPerPoint of moving one
 * issue from `from` to `to` (R-03.7). Positive when the move gains utility;
 * `undefined` when euro equivalents are omitted (R-03.6).
 */
export function eurosFor(
  position: Position,
  issue: IssueKey,
  from: Level,
  to: Level,
): number | undefined {
  const perPoint = eurPerPoint(position);
  if (perPoint === undefined) return undefined;
  return weightedGain(position, { issue, from, to }) * perPoint;
}
