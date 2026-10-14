import { z } from 'zod';
import { buyerScenario, role, scenario } from './counterpart.js';
import { issueKey } from './issues.js';

const fraction = z.number().min(0).max(1);

const likelihood = z
  .partialRecord(
    z.union([scenario, buyerScenario]).describe('Scenario of the counterpart.'),
    fraction.describe('Likelihood of observing the signal under the scenario, in [0, 1].'),
  )
  .describe('P(signal | scenario) for each scenario it applies to.');

const tier = z.enum(['free', 'paid']).describe('Lowest tier allowed to log the signal.');

export const signalCatalogEntry = z
  .object({
    code: z.string().min(1).describe('Unique signal code.'),
    role: role.describe('Role of the user logging the signal.'),
    appliesTo: z.string().min(1).describe('As stored in signal_catalog.applies_to.'),
    labelKey: z.string().min(1).describe('i18n key of the signal label.'),
    likelihood,
    batnaShift: z
      .object({
        pct: z.number().describe('Shift of the counterpart BATNA as a fraction (0.02 = +2 %).'),
        credibilityDefault: fraction.describe('Default credibility as a fraction [0, 1].'),
      })
      .optional()
      .describe('Upward shift of the counterpart BATNA, scaled by credibility.'),
    weightNudge: z
      .partialRecord(issueKey, z.number().describe('Added to the Dirichlet mode (fraction).'))
      .optional()
      .describe('Nudge to counterpart weights per issue.'),
    marginDelta: z
      .number()
      .optional()
      .describe('Change to the negotiation margin mode, as a fraction.'),
    questionKeys: z
      .array(z.string().describe('i18n key of a suggested question.'))
      .describe('Questions that help confirm the signal.'),
    tier,
  })
  .describe('One entry of the signal catalogue (R-02.8).');
export type SignalCatalogEntry = z.infer<typeof signalCatalogEntry>;

const numeric = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform(Number)
  .describe('Postgres numeric, as number or numeric string.');

/** A `signal_catalog` row as returned by Supabase (snake_case, spec 09). */
export const signalCatalogRow = z
  .object({
    code: z.string().describe('signal_catalog.code'),
    role: z.string().describe('signal_catalog.role'),
    applies_to: z.string().describe('signal_catalog.applies_to'),
    label_key: z.string().describe('signal_catalog.label_key'),
    likelihood: z.unknown().describe('signal_catalog.likelihood (jsonb)'),
    batna_shift: z
      .object({
        pct: numeric,
        credibility_default: numeric,
      })
      .nullable()
      .describe('signal_catalog.batna_shift (jsonb) or null'),
    weight_nudge: z.unknown().nullable().describe('signal_catalog.weight_nudge (jsonb) or null'),
    margin_delta: numeric.nullable().describe('signal_catalog.margin_delta or null'),
    question_keys: z
      .array(z.string().describe('Question key.'))
      .describe('signal_catalog.question_keys'),
    tier: z.string().describe('signal_catalog.tier'),
  })
  .describe('Raw signal_catalog row (DB shape).');

/** Maps `signal_catalog` rows to validated entries. Throws on a malformed row. */
export function catalogFromRows(rows: readonly unknown[]): SignalCatalogEntry[] {
  return rows.map((raw) => {
    const row = signalCatalogRow.parse(raw);
    return signalCatalogEntry.parse({
      code: row.code,
      role: row.role,
      appliesTo: row.applies_to,
      labelKey: row.label_key,
      likelihood: row.likelihood,
      ...(row.batna_shift && {
        batnaShift: {
          pct: row.batna_shift.pct,
          credibilityDefault: row.batna_shift.credibility_default,
        },
      }),
      ...(row.weight_nudge != null && { weightNudge: row.weight_nudge }),
      ...(row.margin_delta != null && { marginDelta: row.margin_delta }),
      questionKeys: row.question_keys,
      tier: row.tier,
    });
  });
}
