import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as schemas from './index.js';

type Def = {
  type: string;
  shape?: Record<string, z.ZodType>;
  innerType?: z.ZodType;
  element?: z.ZodType;
  options?: z.ZodType[];
  items?: z.ZodType[];
  keyType?: z.ZodType;
  valueType?: z.ZodType;
  in?: z.ZodType;
};
const def = (s: z.ZodType) => (s as unknown as { _zod: { def: Def } })._zod.def;

/** Description of a field, looking through optional/nullable/default/pipe wrappers. */
function describedAs(s: z.ZodType): string | undefined {
  if (s.description) return s.description;
  const d = def(s);
  const inner = d.innerType ?? (d.type === 'pipe' ? d.in : undefined);
  return inner ? describedAs(inner) : undefined;
}

/** Paths of object fields without a non-empty description, recursively. */
function undescribed(s: z.ZodType, path: string, seen = new Set<z.ZodType>()): string[] {
  if (seen.has(s)) return [];
  seen.add(s);
  const d = def(s);
  const children: [string, z.ZodType][] = [];
  if (d.type === 'object' && d.shape) {
    const missing: string[] = [];
    for (const [k, v] of Object.entries(d.shape)) {
      if (!describedAs(v)?.trim()) missing.push(`${path}.${k}`);
      children.push([`${path}.${k}`, v]);
    }
    return [...missing, ...children.flatMap(([p, c]) => undescribed(c, p, seen))];
  }
  if (d.innerType) children.push([path, d.innerType]);
  if (d.type === 'pipe' && d.in) children.push([path, d.in]);
  if (d.element) children.push([`${path}[]`, d.element]);
  for (const o of d.options ?? []) children.push([`${path}|`, o]);
  for (const [i, t] of (d.items ?? []).entries()) children.push([`${path}[${i}]`, t]);
  if (d.valueType) children.push([`${path}{}`, d.valueType]);
  return children.flatMap(([p, c]) => undescribed(c, p, seen));
}

const exportedSchemas = (): [string, z.ZodType][] => [
  ...Object.entries(schemas).filter((e): e is [string, z.ZodType] => e[1] instanceof z.ZodType),
  ...Object.entries(schemas.formSchemas).flatMap(([n, v]) => [
    [`${n}.free`, v.free] as [string, z.ZodType],
    [`${n}.paid`, v.paid] as [string, z.ZodType],
  ]),
];

describe('package exports', () => {
  it('AC-02.1 exports every schema named in spec 02', () => {
    const names = [
      'issueKey',
      'issueKind',
      'issueDef',
      'shape',
      'position',
      'hardConstraint',
      'ownBatnaInput',
      'scenario',
      'buyerScenario',
      'counterpartInput',
      'signalEvent',
      'offer',
      'pkg',
      'signalCatalogEntry',
      'marketReference',
      'propertyFacts',
      'knownPosition',
      'engineInput',
      'engineOutput',
      'cents',
    ];
    for (const n of names) {
      expect(schemas[n as keyof typeof schemas], n).toBeInstanceOf(z.ZodType);
    }
    for (const fn of ['toEngine', 'fromEngine', 'catalogFromRows', 'canonicalEngineInput']) {
      expect(typeof schemas[fn as keyof typeof schemas], fn).toBe('function');
    }
  });

  it('AC-02.10 every schema field has a non-empty description', () => {
    const all = exportedSchemas();
    expect(all.length).toBeGreaterThan(30);
    const missing = all.flatMap(([name, s]) => undescribed(s, name));
    expect(missing).toEqual([]);
  });
});
