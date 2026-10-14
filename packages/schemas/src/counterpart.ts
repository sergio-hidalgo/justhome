import { z } from 'zod';
import { issueKey } from './issues.js';

export const role = z.enum(['buyer', 'seller']).describe('Side of the negotiation.');
export type Role = z.infer<typeof role>;

export const scenario = z
  .enum(['A', 'B', 'C'])
  .describe(
    'Seller scenario: A lives there and has not bought, B already bought, C needs to sell to buy.',
  );
export type Scenario = z.infer<typeof scenario>;

export const buyerScenario = z
  .enum(['renting_flexible', 'renting_deadline', 'owner_chain', 'cash_investor'])
  .describe('Buyer scenario of the counterpart.');
export type BuyerScenario = z.infer<typeof buyerScenario>;

export const isoDate = z.iso.date().describe('Calendar date, ISO YYYY-MM-DD.');

export const pkg = z
  .partialRecord(
    issueKey,
    z
      .union([z.number(), z.string()])
      .describe('Level of the issue: euros for price, days, percent points, or a level id.'),
  )
  .describe('A package: one level per issue (engine units, money in euros).');
export type Package = z.infer<typeof pkg>;

export const signalEvent = z
  .object({
    code: z.string().min(1).describe('Signal code; must exist in the signal catalogue.'),
    value: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Optional value observed with the signal (e.g. number of drops).'),
    credibility: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Credibility as a fraction [0, 1]; omitted = catalogue default.'),
    at: isoDate.describe('Date the signal was observed, ISO YYYY-MM-DD.'),
  })
  .describe('One observation about the counterpart logged by the user.');
export type SignalEvent = z.infer<typeof signalEvent>;

export const offer = z
  .object({
    direction: z
      .enum(['sent', 'received'])
      .describe('Whether the user sent or received the offer.'),
    pkg: pkg.describe('Terms offered (engine units, money in euros).'),
    at: isoDate.describe('Date of the offer, ISO YYYY-MM-DD.'),
  })
  .describe('An offer exchanged with the counterpart.');
export type Offer = z.infer<typeof offer>;

export const counterpartInput = z
  .object({
    id: z.string().min(1).describe('Counterpart identifier (UUID in the DB).'),
    label: z
      .string()
      .min(1)
      .max(30)
      .describe('Neutral label such as "Comprador A"; never a real name.'),
    role: role.describe('Role of the counterpart (not of the user).'),
    answers: z
      .record(
        z.string().describe('Question key.'),
        z.string().describe("Answer level; 'unknown' allowed and keeps the prior."),
      )
      .describe("Quick-form answers about the counterpart; any answer may be 'unknown'."),
    signals: z.array(signalEvent).describe('Signals logged about the counterpart.'),
    offers: z.array(offer).describe('Offers exchanged with the counterpart.'),
  })
  .describe('What the user knows about the other side (R-02.4).');
export type CounterpartInput = z.infer<typeof counterpartInput>;
