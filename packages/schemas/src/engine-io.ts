import { z } from 'zod';
import { signalCatalogEntry } from './catalog.js';
import { counterpartInput } from './counterpart.js';
import { marginProvenance, marketReference } from './market.js';
import { position } from './position.js';

export const propertyFacts = z
  .object({
    ccaa: z.string().min(1).describe('Autonomous community (CCAA).'),
    municipality: z.string().min(1).describe('Municipality name.'),
    askingPrice: z.number().positive().describe('Current asking price in euros.'),
    daysOnMarket: z.number().int().min(0).describe('Days since the listing was published.'),
    priceDropCount: z.number().int().min(0).describe('Number of asking price drops.'),
    priceDrops: z
      .array(
        z
          .object({
            daysAfterListing: z.number().int().min(0).describe('Days after listing of the drop.'),
            amount: z.number().positive().describe('Size of the drop in euros.'),
          })
          .describe('One asking price drop.'),
      )
      .optional()
      .describe('Detail of each price drop (paid tier).'),
    sizeM2: z.number().positive().optional().describe('Built area in m².'),
    condition: z.enum(['resale', 'new']).optional().describe('Resale or new build.'),
    appraisal: z.number().positive().optional().describe('Appraisal value in euros (seller).'),
  })
  .describe('Facts about the property, in engine units (euros, days). See issue 006.');
export type PropertyFacts = z.infer<typeof propertyFacts>;

/** The other side's real position in joint mode (spec 19). */
export const knownPosition = position.describe("The other side's real Position (joint mode).");
export type KnownPosition = z.infer<typeof knownPosition>;

export const engineInput = z
  .object({
    me: position.describe("The user's own position."),
    other: z
      .union([counterpartInput, knownPosition])
      .describe('Estimated counterpart, or the known position in joint mode.'),
    property: propertyFacts,
    market: marketReference,
    catalog: z
      .array(signalCatalogEntry)
      .describe('Full signal catalogue; an empty array means no signal has any effect.'),
    tier: z.enum(['free', 'paid']).describe('Tier of the user running the analysis.'),
    options: z
      .object({
        draws: z.number().int().positive().optional().describe('Monte Carlo draws.'),
        levelsPerIssue: z
          .number()
          .int()
          .min(2)
          .optional()
          .describe('Discretisation levels per numeric issue.'),
      })
      .optional()
      .describe('Engine tuning options; defaults apply when omitted.'),
  })
  .superRefine((input, ctx) => {
    if (!('signals' in input.other)) return;
    const known = new Set(input.catalog.map((e) => e.code));
    input.other.signals.forEach((s, i) => {
      if (!known.has(s.code)) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown signal code: ${s.code}`,
          path: ['other', 'signals', i, 'code'],
        });
      }
    });
  })
  .describe('Everything the engine needs for one analysis (R-02.5).');
export type EngineInput = z.infer<typeof engineInput>;

export const explain = z
  .object({
    key: z.string().min(1).describe('Explanation i18n key (packages/i18n).'),
    params: z
      .record(
        z.string().describe('Parameter name.'),
        z.union([z.string(), z.number()]).describe('Parameter value (raw, unformatted).'),
      )
      .describe('Values interpolated into the explanation.'),
  })
  .describe('Explanation as an i18n key with parameters (R-07.3).');
export type Explain = z.infer<typeof explain>;

/** Sections owned by specs 04–07 are typed `unknown` until those specs land (issue 006). */
export const engineOutput = z
  .object({
    engineVersion: z.string().min(1).describe('Version of the engine that produced the output.'),
    inputsHash: z.string().min(1).describe('Hash of the canonical EngineInput.'),
    marketProvenance: marginProvenance.describe('Provenance of the margin used.'),
    assumptions: z.array(explain).describe('Inputs the engine filled in or took as assumed.'),
    limitations: z.array(explain).describe('Known limitations of this analysis.'),
    batna: z.unknown().describe('BATNAs (spec 04).'),
    estimate: z.unknown().describe('Counterpart estimate (spec 05).'),
    metrics: z.unknown().describe('ZOPA / frontier metrics (spec 06).'),
    packages: z.unknown().describe('Candidate packages (spec 06).'),
    recommendation: z.unknown().describe('Recommended package (spec 07).'),
    lights: z.unknown().describe('Traffic lights (spec 07).'),
    strategy: z.unknown().describe('Strategy outputs (spec 07).'),
  })
  .describe('Result of one analysis (R-02.5).');
export type EngineOutput = z.infer<typeof engineOutput>;

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

/**
 * Canonical JSON of an EngineInput: sorted keys, no `undefined`, catalogue sorted
 * by `code`. `inputsHash` is computed over this string (R-02.5).
 */
export function canonicalEngineInput(input: EngineInput): string {
  const catalog = [...input.catalog].sort((a, b) =>
    a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
  );
  return JSON.stringify(sortKeys({ ...input, catalog }));
}
