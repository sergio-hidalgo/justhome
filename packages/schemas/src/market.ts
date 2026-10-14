import { z } from 'zod';
import { isoDate } from './counterpart.js';

export const marketLevel = z
  .enum(['national', 'ccaa', 'province', 'city'])
  .describe('Geographic level of the row that supplied the value.');

export const marginKind = z
  .enum(['asking_to_sale', 'market_gap', 'listing_cut'])
  .describe('What the negotiation margin measures (spec 14 R-14.2, D-19).');
export type MarginKind = z.infer<typeof marginKind>;

const provenanceFields = {
  level: marketLevel,
  sourceId: z.string().min(1).describe('Id in the market source registry.'),
  sourceUrl: z.string().min(1).describe('URL (or repo path for assumptions) of the source.'),
  asOf: isoDate.describe('Date the value refers to, ISO YYYY-MM-DD.'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence in the value.'),
  note: z.string().nullable().describe('Free-text note from the source row, or null.'),
  assumed: z.boolean().describe('True when the value is a modelling assumption, not sourced.'),
};

function sourced<T extends z.ZodType>(value: T, what: string) {
  return z.object({ value, ...provenanceFields }).describe(`${what}, with its provenance.`);
}

const eurRange = z
  .tuple([
    z.number().min(0).describe('Low end, euros per month.'),
    z.number().min(0).describe('High end, euros per month.'),
  ])
  .describe('Monthly holding cost range [low, high] in euros.');

export const domAdjustment = z
  .object({
    daysMin: z
      .number()
      .int()
      .nullable()
      .describe('Minimum days on market (inclusive); null = any.'),
    daysMax: z
      .number()
      .int()
      .nullable()
      .describe('Maximum days on market (exclusive); null = any.'),
    dropsMin: z.number().int().nullable().describe('Minimum price drops; null = any.'),
    dropsMax: z.number().int().nullable().describe('Maximum price drops; null = any.'),
    earlyDropWithinDays: z
      .number()
      .int()
      .nullable()
      .describe('Matches when a drop happened within this many days of listing; null = n/a.'),
    marginDelta: z.number().describe('Change to the margin mode, as a fraction.'),
  })
  .describe('One time-on-market adjustment rule (spec 05 R-05.1).');
export type DomAdjustment = z.infer<typeof domAdjustment>;

export const marginProvenance = z
  .object({
    value: z.number().describe('Negotiation margin as a fraction of asking price.'),
    ...provenanceFields,
    marginKind,
  })
  .describe('Negotiation margin with provenance and measure kind.');
export type MarginProvenance = z.infer<typeof marginProvenance>;

export const marketReference = z
  .object({
    negotiationMargin: marginProvenance,
    itpRate: sourced(z.number().min(0).max(1).describe('ITP rate as a fraction.'), 'ITP rate'),
    holdingCost: z
      .object({
        A: sourced(eurRange, 'Holding cost range for scenario A'),
        B: sourced(eurRange, 'Holding cost range for scenario B'),
        C: sourced(eurRange, 'Holding cost range for scenario C'),
      })
      .describe('Seller monthly holding cost ranges per scenario.'),
    domAdjustments: sourced(
      z.array(domAdjustment).describe('Time-on-market adjustment rules.'),
      'Time-on-market adjustments',
    ),
    horizonMonths: sourced(
      z.number().positive().describe('Typical selling horizon in months.'),
      'Selling horizon',
    ),
    rentPerM2: sourced(z.number().min(0).describe('Monthly rent in euros per m².'), 'Rent per m²'),
  })
  .describe('Resolved market data for the property location (spec 14 R-14.5), in euros.');
export type MarketReference = z.infer<typeof marketReference>;
