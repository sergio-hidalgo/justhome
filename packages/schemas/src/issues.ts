import { z } from 'zod';

export const ISSUE_KEYS = [
  'price',
  'closingDays',
  'costs',
  'arrasPct',
  'mortgageContingency',
  'furniture',
  'rentBackDays',
] as const;

/** Issues available on the free tier (D-01). */
export const FREE_ISSUE_KEYS = ['price', 'closingDays', 'costs'] as const;

export const issueKey = z.enum(ISSUE_KEYS).describe('Negotiable issue identifier.');
export type IssueKey = z.infer<typeof issueKey>;

export const freeIssueKey = z
  .enum(FREE_ISSUE_KEYS)
  .describe('Negotiable issue available on the free tier: price, closingDays or costs.');
export type FreeIssueKey = z.infer<typeof freeIssueKey>;

export const issueKind = z
  .enum(['monetary', 'numeric', 'ordinal', 'boolean'])
  .describe('How levels of the issue are expressed.');
export type IssueKind = z.infer<typeof issueKind>;

export const issueDef = z
  .object({
    key: issueKey,
    kind: issueKind,
    unit: z
      .enum(['EUR', 'days', 'pct'])
      .nullable()
      .describe('Unit of numeric levels (EUR, days or percent points); null for ordinal/boolean.'),
    levels: z
      .array(z.string().describe('Level identifier.'))
      .optional()
      .describe('Ordered levels for ordinal/boolean issues.'),
    defaultRange: z
      .tuple([
        z.number().describe('Lower bound, in the issue unit.'),
        z.number().describe('Upper bound, in the issue unit.'),
      ])
      .optional()
      .describe('Default [min, max] range for numeric issues, in the issue unit.'),
    freeTier: z.boolean().describe('True when the issue is available on the free tier.'),
  })
  .describe('Static definition of a negotiable issue (R-02.1).');
export type IssueDef = z.infer<typeof issueDef>;

/** Issue catalogue (R-02.1). Price has no default range: it is user-defined. */
export const ISSUES: Readonly<Record<IssueKey, IssueDef>> = {
  price: { key: 'price', kind: 'monetary', unit: 'EUR', freeTier: true },
  closingDays: {
    key: 'closingDays',
    kind: 'numeric',
    unit: 'days',
    defaultRange: [15, 180],
    freeTier: true,
  },
  costs: {
    key: 'costs',
    kind: 'ordinal',
    unit: null,
    levels: ['buyer', 'split', 'seller'],
    freeTier: true,
  },
  arrasPct: {
    key: 'arrasPct',
    kind: 'numeric',
    unit: 'pct',
    defaultRange: [5, 15],
    freeTier: false,
  },
  mortgageContingency: {
    key: 'mortgageContingency',
    kind: 'boolean',
    unit: null,
    levels: ['no', 'yes'],
    freeTier: false,
  },
  furniture: {
    key: 'furniture',
    kind: 'ordinal',
    unit: null,
    levels: ['none', 'partial', 'all'],
    freeTier: false,
  },
  rentBackDays: {
    key: 'rentBackDays',
    kind: 'numeric',
    unit: 'days',
    defaultRange: [0, 90],
    freeTier: false,
  },
};
