import type { HardConstraint, Package } from '@vivienda/schemas';

function bound(
  level: number | string,
  value: number | string,
  c: HardConstraint,
): [number, number] {
  if (typeof level !== 'number' || typeof value !== 'number') {
    throw new TypeError(`${c.op} needs numeric levels on ${c.issue}`);
  }
  return [level, value];
}

function holds(c: HardConstraint, pkg: Package): boolean {
  const level = pkg[c.issue];
  if (level === undefined) throw new RangeError(`package has no level for issue: ${c.issue}`);
  switch (c.op) {
    case 'in':
      return c.value.includes(level);
    case '==':
      return level === c.value;
    case '!=':
      return level !== c.value;
    case '<=': {
      const [x, v] = bound(level, c.value, c);
      return x <= v;
    }
    case '>=': {
      const [x, v] = bound(level, c.value, c);
      return x >= v;
    }
  }
}

/** True when the package meets every hard constraint (R-03.3, ops per spec 02b). */
export function satisfies(constraints: readonly HardConstraint[], pkg: Package): boolean {
  return constraints.every((c) => holds(c, pkg));
}
