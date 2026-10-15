import type { Shape } from '@vivienda/schemas';

const clamp = (x: number): number => Math.min(100, Math.max(0, x));

function numeric(level: number | string): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) {
    throw new TypeError(`numeric level expected, got ${String(level)}`);
  }
  return level;
}

/** Linear from `zero` → 0 to `hundred` → 100, clamped. */
function linear(level: number, zero: number, hundred: number): number {
  if (zero === hundred) throw new RangeError(`degenerate range: worst equals best (${zero})`);
  return clamp(((level - zero) / (hundred - zero)) * 100);
}

/** Value of one issue level for one side, on [0, 100] (R-03.1). */
export function valueOf(shape: Shape, level: number | string): number {
  switch (shape.type) {
    case 'increasing':
    case 'decreasing':
      return linear(numeric(level), shape.worst, shape.best);
    case 'peaked': {
      const x = numeric(level);
      const [lo, hi] = shape.worst;
      if (x === shape.ideal) return 100;
      if (x <= lo || x >= hi) return 0;
      return x < shape.ideal ? linear(x, lo, shape.ideal) : linear(x, hi, shape.ideal);
    }
    case 'ordinal': {
      const score = shape.scores[String(level)];
      if (score === undefined) throw new RangeError(`unknown ordinal level: ${String(level)}`);
      return clamp(score);
    }
  }
}
