import { z } from 'zod';
import { isoDate } from './counterpart.js';
import { freeIssueKey, issueKey } from './issues.js';
import { cents } from './money.js';
import { WEIGHT_SUM_TOLERANCE, constraintOver } from './position.js';

/**
 * Wizard step schemas (R-02.6). API-facing: money in integer cents.
 * Free/paid split follows the step tables of specs 16 and 17 (issue 006).
 * Every enum question accepts 'unknown' ("No lo sé"), which keeps the prior.
 */

function choice<const T extends readonly [string, ...string[]]>(values: T, description: string) {
  return z.enum([...values, 'unknown']).describe(`${description} 'unknown' allowed.`);
}

const yesNo = (description: string) => choice(['yes', 'no'], description);

const level = z
  .union([z.number(), z.string()])
  .describe('Issue level: cents for price, days, percent points, or a level id.');

const apiPackage = z
  .partialRecord(issueKey, level)
  .describe('Package of terms; price in integer cents.');

// ---- Property (step 1, exempt from the 3-question rule) ----

const propertyFree = {
  ccaa: z.string().min(1).describe('Autonomous community (CCAA).'),
  municipality: z.string().min(1).describe('Municipality name.'),
  askingPriceCents: cents.positive().describe('Current asking price in integer cents.'),
};

const priceDrop = z
  .object({
    date: isoDate.describe('Date of the drop, ISO YYYY-MM-DD.'),
    amountCents: cents.positive().describe('Size of the drop in integer cents.'),
  })
  .describe('One asking price drop.');

const buyerPropertyFree = z
  .object({
    ...propertyFree,
    daysOnMarket: z.number().int().min(0).optional().describe('Days on market.'),
    listingDate: isoDate.optional().describe('Listing date, ISO YYYY-MM-DD.'),
    priceDropCount: z.number().int().min(0).describe('Number of asking price drops.'),
  })
  .describe('Buyer step 1, free fields.');

const listingKnown = (p: { daysOnMarket?: number | undefined; listingDate?: string | undefined }) =>
  p.daysOnMarket !== undefined || p.listingDate !== undefined;
const listingKnownError = { message: 'daysOnMarket or listingDate is required' };

export const buyerPropertyStep = {
  free: buyerPropertyFree.refine(listingKnown, listingKnownError),
  paid: buyerPropertyFree
    .extend({
      priceDrops: z.array(priceDrop).optional().describe('Dates and amounts of price drops.'),
      sizeM2: z.number().positive().optional().describe('Built area in m².'),
      condition: choice(['resale', 'new'], 'Resale or new build.').optional(),
      listingUrl: z
        .url({ protocol: /^https?$/ })
        .optional()
        .describe('http(s) URL of the listing.'),
      catastralRefHash: z
        .string()
        .regex(/^[0-9a-f]{64}$/)
        .optional()
        .describe('SHA-256 hex of the catastral reference, hashed client-side.'),
    })
    .refine(listingKnown, listingKnownError)
    .describe('Buyer step 1, paid fields.'),
};

// ---- Buyer position ----

const buyerPositionFree = z
  .object({
    maxBudgetCents: cents.positive().describe('Maximum budget in integer cents.'),
    monthlyRentCents: cents.min(0).optional().describe('Current monthly rent in integer cents.'),
    bestAlternative: z
      .object({
        priceCents: cents.positive().describe('Price of the alternative property in cents.'),
        earliestClosingDate: isoDate
          .optional()
          .describe('Earliest closing date of the alternative, ISO YYYY-MM-DD.'),
      })
      .optional()
      .describe('Best alternative property, if any.'),
  })
  .describe('Buyer position, free fields.');

export const buyerPositionStep = {
  free: buyerPositionFree,
  paid: buyerPositionFree
    .extend({
      leaseEndDate: isoDate.optional().describe('End of the current lease, ISO YYYY-MM-DD.'),
      financing: z
        .object({
          preApproved: yesNo('Mortgage pre-approved?'),
          amountCents: cents.min(0).optional().describe('Pre-approved amount in integer cents.'),
          cashPct: z
            .number()
            .min(0)
            .max(100)
            .optional()
            .describe('Share paid in cash, percent points [0, 100].'),
        })
        .optional()
        .describe('Financing situation.'),
    })
    .describe('Buyer position, paid fields.'),
};

// ---- Priorities (shared by buyer and seller) ----

const weightProfileChoice = choice(
  ['price_first', 'speed_first', 'balanced'],
  'Preset weight profile.',
);

const prioritiesPaid = z
  .object({
    issues: z.array(issueKey).min(1).describe('Issues to negotiate.'),
    ranges: z
      .partialRecord(
        issueKey,
        z
          .object({
            worst: level.describe('Worst acceptable level (price in cents).'),
            best: level.describe('Best level (price in cents).'),
          })
          .describe('Worst/best range for the issue.'),
      )
      .describe('Worst/best range per chosen issue.'),
    constraints: z
      .array(constraintOver(level, 'cents for price'))
      .describe('Hard limits the user will not cross.'),
    weights: z
      .partialRecord(issueKey, z.number().min(0).max(1).describe('Weight as a fraction [0, 1].'))
      .describe('Swing weights per issue as fractions; must sum to 1 (±1e-9).'),
    weightProfile: weightProfileChoice.optional(),
  })
  .refine(
    (p) =>
      Math.abs(Object.values(p.weights).reduce<number>((a, w) => a + (w ?? 0), 0) - 1) <=
      WEIGHT_SUM_TOLERANCE,
    { message: 'weights must sum to 1 (±1e-9)', path: ['weights'] },
  )
  .describe('Issues, ranges, limits and weights (paid).');

export const buyerPrioritiesStep = {
  free: z
    .object({
      issues: z
        .array(freeIssueKey)
        .min(1)
        .describe('Issues to negotiate; free tier allows price, closingDays, costs only.'),
      weightProfile: weightProfileChoice,
    })
    .describe('Buyer priorities, free fields.'),
  paid: prioritiesPaid,
};

// ---- Buyer view of the seller ----

const buyerSeller = z
  .object({
    habitualHome: yesNo("Is it the seller's habitual home?"),
    occupancy: choice(['empty', 'lived_in'], 'Is the home empty or lived in?'),
    inHurry: yesNo('Does the seller seem in a hurry?'),
  })
  .describe('What the buyer knows about the seller.');

export const buyerSellerStep = { free: buyerSeller, paid: buyerSeller };

// ---- Seller steps (first analysis is full: free = paid, issue 006) ----

const sellerProperty = z
  .object({
    ...propertyFree,
    listingDate: isoDate.describe('Listing date, ISO YYYY-MM-DD.'),
    priceDrops: z.array(priceDrop).describe('Price changes since listing.'),
    appraisalCents: cents.positive().optional().describe('Appraisal value in integer cents.'),
    sizeM2: z.number().positive().optional().describe('Built area in m².'),
    catastralRefHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional()
      .describe('SHA-256 hex of the catastral reference, hashed client-side.'),
  })
  .describe('Seller step 1.');

export const sellerPropertyStep = { free: sellerProperty, paid: sellerProperty };

const monthlyCost = (what: string) =>
  cents.min(0).optional().describe(`${what}, integer cents per month.`);

const sellerPosition = z
  .object({
    situation: choice(
      ['lives_not_bought', 'already_bought', 'sell_to_buy', 'not_habitual'],
      'Seller situation.',
    ),
    deadlineDate: isoDate.optional().describe('Date by which the seller must sell.'),
    holdingCosts: z
      .object({
        useTypical: z.boolean().describe('Use typical values from market data instead.'),
        ibiCents: monthlyCost('IBI'),
        communityCents: monthlyCost('Community fees'),
        insuranceCents: monthlyCost('Insurance'),
        mortgageCents: monthlyCost('Mortgage payment'),
        secondMortgageCents: monthlyCost('Second mortgage payment'),
      })
      .describe('Monthly holding costs.'),
    bestAlternative: z
      .object({
        kind: choice(['other_offer', 'rent_out', 'keep_waiting'], 'Best alternative.'),
        amountCents: cents
          .min(0)
          .optional()
          .describe('Other offer amount, or monthly rent if renting out, in integer cents.'),
      })
      .describe('Best alternative to a deal.'),
    taxHints: z
      .object({
        reinvestHabitual: yesNo('Reinvesting in a new habitual home?'),
        purchasePriceCents: cents.positive().optional().describe('Original purchase price, cents.'),
        purchaseYear: z.number().int().min(1900).optional().describe('Year of purchase.'),
      })
      .describe('Informational tax hints (plusvalía / IRPF).'),
  })
  .describe('Seller position.');

export const sellerPositionStep = { free: sellerPosition, paid: sellerPosition };

export const sellerPrioritiesStep = { free: prioritiesPaid, paid: prioritiesPaid };

const sellerOffer = z
  .object({
    label: z
      .string()
      .min(1)
      .max(30)
      .describe('Neutral buyer label such as "Comprador A"; no real names.'),
    pkg: apiPackage,
    renting: yesNo('Is the buyer renting?'),
    leaseEndsSoon: yesNo("Does the buyer's lease end soon?"),
    preApprovalShown: yesNo('Has the buyer shown a mortgage pre-approval?'),
    cash: yesNo('Is the buyer paying cash?'),
    firstTimeBuyer: yesNo('Is it a first-time buyer?'),
  })
  .describe('First offer and what the seller knows about the buyer.');

export const sellerOfferStep = { free: sellerOffer, paid: sellerOffer };

// ---- Signal log ----

const signalFree = z
  .object({
    code: z.string().min(1).describe('Signal catalogue code.'),
    value: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Optional value observed with the signal.'),
    at: isoDate.describe('Date observed, ISO YYYY-MM-DD.'),
  })
  .describe('A signal logged by the user (free: catalogue credibility).');

export const signalLogEntry = {
  free: signalFree,
  paid: signalFree
    .extend({
      credibility: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Credibility as a fraction [0, 1]; omitted = catalogue default.'),
    })
    .describe('A signal logged by the user, with adjustable credibility.'),
};

export type BuyerPropertyStepFree = z.infer<typeof buyerPropertyStep.free>;
export type BuyerPropertyStepPaid = z.infer<typeof buyerPropertyStep.paid>;
export type BuyerPositionStepFree = z.infer<typeof buyerPositionStep.free>;
export type BuyerPositionStepPaid = z.infer<typeof buyerPositionStep.paid>;
export type BuyerPrioritiesStepFree = z.infer<typeof buyerPrioritiesStep.free>;
export type BuyerPrioritiesStepPaid = z.infer<typeof buyerPrioritiesStep.paid>;
export type BuyerSellerStep = z.infer<typeof buyerSeller>;
export type SellerPropertyStep = z.infer<typeof sellerProperty>;
export type SellerPositionStep = z.infer<typeof sellerPosition>;
export type SellerPrioritiesStep = z.infer<typeof prioritiesPaid>;
export type SellerOfferStep = z.infer<typeof sellerOffer>;
export type SignalLogEntryFree = z.infer<typeof signalLogEntry.free>;
export type SignalLogEntryPaid = z.infer<typeof signalLogEntry.paid>;

/** All form schemas, for tests and tooling. */
export const formSchemas = {
  buyerPropertyStep,
  buyerPositionStep,
  buyerPrioritiesStep,
  buyerSellerStep,
  sellerPropertyStep,
  sellerPositionStep,
  sellerPrioritiesStep,
  sellerOfferStep,
  signalLogEntry,
} as const;
