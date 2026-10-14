import { describe, expect, it } from 'vitest';
import { ISSUE_KEYS, ISSUES, issueDef } from './issues.js';

describe('issue catalogue', () => {
  it('R-02.1 matches the spec table', () => {
    const rows = ISSUE_KEYS.map((k) => {
      const d = ISSUES[k];
      return [d.key, d.kind, d.unit, d.defaultRange ?? d.levels ?? null, d.freeTier];
    });
    expect(rows).toEqual([
      ['price', 'monetary', 'EUR', null, true],
      ['closingDays', 'numeric', 'days', [15, 180], true],
      ['costs', 'ordinal', null, ['buyer', 'split', 'seller'], true],
      ['arrasPct', 'numeric', 'pct', [5, 15], false],
      ['mortgageContingency', 'boolean', null, ['no', 'yes'], false],
      ['furniture', 'ordinal', null, ['none', 'partial', 'all'], false],
      ['rentBackDays', 'numeric', 'days', [0, 90], false],
    ]);
    for (const d of Object.values(ISSUES)) expect(issueDef.parse(d)).toEqual(d);
  });
});
