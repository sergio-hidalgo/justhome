import { z } from 'zod';
import { pkg, role } from './counterpart.js';
import { issueKey } from './issues.js';
import { shape } from './shapes.js';

/** Weights must sum to 1 within this tolerance (Constitution §5). */
export const WEIGHT_SUM_TOLERANCE = 1e-9;

export const hardConstraint = z
  .object({
    issue: issueKey,
    op: z.enum(['<=', '>=', '=']).describe('Comparison the package level must satisfy.'),
    value: z
      .union([z.number(), z.string()])
      .describe('Bound in the issue unit (euros for price) or a level id.'),
  })
  .describe('A limit the user will not cross, e.g. price <= 320000.');
export type HardConstraint = z.infer<typeof hardConstraint>;

export const ownBatnaInput = z
  .object({
    alternative: pkg
      .nullable()
      .describe('Best alternative deal (euros); null = keep the status quo.'),
    statusQuo: pkg
      .optional()
      .describe('Seller: keep the home at current asking terms; buyer: keep renting (euros).'),
    monthlyWaitCost: z
      .number()
      .min(0)
      .describe('Cost of waiting, euros per month (user-entered or derived).'),
    monthlyOpportunityCost: z
      .number()
      .min(0)
      .optional()
      .describe('Opportunity cost, euros per month (seller B/C, investor).'),
    alternativeExpiresInDays: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Days until the alternative is no longer available.'),
  })
  .describe("The user's own best alternative to agreement (spec 04 R-04.1).");
export type OwnBatnaInput = z.infer<typeof ownBatnaInput>;

export const weightProfile = z
  .enum(['price_first', 'speed_first', 'balanced'])
  .describe('Preset weight profile (free tier).');
export type WeightProfile = z.infer<typeof weightProfile>;

export const position = z
  .object({
    role: role.describe('Role of the user.'),
    issues: z.array(issueKey).min(1).describe('Issues the user negotiates.'),
    shapes: z.partialRecord(issueKey, shape).describe('Value function per selected issue.'),
    weights: z
      .partialRecord(issueKey, z.number().min(0).max(1).describe('Weight as a fraction [0, 1].'))
      .describe('Importance per issue as fractions; must sum to 1 (±1e-9).'),
    constraints: z.array(hardConstraint).describe('Hard limits the user will not cross.'),
    batna: ownBatnaInput,
    weightProfile: weightProfile.optional(),
  })
  .refine(
    (p) => {
      const sum = Object.values(p.weights).reduce<number>((a, w) => a + (w ?? 0), 0);
      return Math.abs(sum - 1) <= WEIGHT_SUM_TOLERANCE;
    },
    { message: 'weights must sum to 1 (±1e-9)', path: ['weights'] },
  )
  .describe("The user's side of the negotiation (R-02.3).");
export type Position = z.infer<typeof position>;
