import type { MarketReference, OwnBatnaInput, Package, Position } from '@vivienda/schemas';
import { BATNA_HORIZON_MONTHS, DAYS_PER_MONTH } from './params.js';
import { eurPerPoint, utility } from './utility.js';

/** Priors must sum to 1 within this tolerance (same rule as weights, Constitution §5). */
const PRIOR_SUM_TOLERANCE = 1e-9;

export type BatnaHorizon = (typeof BATNA_HORIZON_MONTHS)[number];

/** BATNA at one point in time; `eur` is omitted when price is not an issue (R-03.6). */
export interface BatnaValue {
  points: number;
  eur?: number;
}

/** Own BATNA today and at each horizon (R-04.4). */
export interface OwnBatna {
  today: BatnaValue;
  horizons: (BatnaValue & { months: BatnaHorizon })[];
  decayPerMonthEur: number;
  /** 0 when euro equivalents are omitted (no price issue): the BATNA does not decay. */
  decayPerMonthPoints: number;
}

export type SellerScenario = 'A' | 'B' | 'C';

/**
 * Situation used to derive a default monthly wait cost (R-04.3). Callers map the seller
 * form: lives_not_bought → A, already_bought → B, sell_to_buy → C, not_habitual and
 * "I don't know" → unknown (an investor's cost goes in `monthlyOpportunityCost`).
 */
export type WaitCostSituation =
  | { kind: 'renting'; monthlyRentEur: number }
  | { kind: 'seller'; scenario: SellerScenario }
  | { kind: 'seller_unknown'; priors: Readonly<Record<SellerScenario, number>> };

/** Monthly wait-cost range in euros; `mid` is used for the own BATNA, the range in UI. */
export interface WaitCostRange {
  low: number;
  high: number;
  mid: number;
}

/** Package the BATNA rests on `months` from now: the alternative, unless null or expired. */
function basePackage(input: OwnBatnaInput, months: number): Package | undefined {
  const expired =
    input.alternativeExpiresInDays !== undefined &&
    input.alternativeExpiresInDays < months * DAYS_PER_MONTH;
  if (input.alternative === null || expired) return input.statusQuo;
  return input.alternative;
}

function monthlyDecayEur(input: OwnBatnaInput): number {
  return input.monthlyWaitCost + (input.monthlyOpportunityCost ?? 0);
}

/**
 * U(alt) − (monthlyWaitCost + monthlyOpportunityCost) · months / eurPerPoint, floored at 0
 * (R-04.2). The status quo replaces an alternative that is null or has expired (R-04.5);
 * with neither, the base utility is 0. Without a price issue there is no decay.
 */
export function batnaUtility(position: Position, input: OwnBatnaInput, months = 0): number {
  if (!Number.isFinite(months) || months < 0) {
    throw new RangeError(`months must be a non-negative number, got ${months}`);
  }
  const pkg = basePackage(input, months);
  const base = pkg === undefined ? 0 : utility(position, pkg);
  const perPoint = eurPerPoint(position);
  const decay = perPoint === undefined ? 0 : (monthlyDecayEur(input) * months) / perPoint;
  return Math.max(0, base - decay);
}

/** The user's own BATNA today and at 1, 3 and 6 months, in points and euros (R-04.4). */
export function ownBatna(position: Position): OwnBatna {
  const input = position.batna;
  const perPoint = eurPerPoint(position);
  const value = (months: number): BatnaValue => {
    const points = batnaUtility(position, input, months);
    return perPoint === undefined ? { points } : { points, eur: points * perPoint };
  };
  const decayPerMonthEur = monthlyDecayEur(input);
  return {
    today: value(0),
    horizons: BATNA_HORIZON_MONTHS.map((months) => ({ months, ...value(months) })),
    decayPerMonthEur,
    decayPerMonthPoints: perPoint === undefined ? 0 : decayPerMonthEur / perPoint,
  };
}

function range(low: number, high: number): WaitCostRange {
  return { low, high, mid: (low + high) / 2 };
}

/**
 * Default monthly wait cost when the user leaves the field empty (R-04.3). Seller ranges
 * come from `market.holdingCost`; "unknown" is the prior-weighted mean of A/B/C, with the
 * priors supplied by the caller (spec 05).
 */
export function defaultWaitCost(
  situation: WaitCostSituation,
  market: Pick<MarketReference, 'holdingCost'>,
): WaitCostRange {
  switch (situation.kind) {
    case 'renting':
      return range(situation.monthlyRentEur, situation.monthlyRentEur);
    case 'seller': {
      const [low, high] = market.holdingCost[situation.scenario].value;
      return range(low, high);
    }
    case 'seller_unknown': {
      const scenarios: SellerScenario[] = ['A', 'B', 'C'];
      let sum = 0;
      let low = 0;
      let high = 0;
      for (const s of scenarios) {
        const p = situation.priors[s];
        if (!Number.isFinite(p) || p < 0) {
          throw new RangeError(`prior for scenario ${s} must be >= 0, got ${p}`);
        }
        const [l, h] = market.holdingCost[s].value;
        sum += p;
        low += p * l;
        high += p * h;
      }
      if (Math.abs(sum - 1) > PRIOR_SUM_TOLERANCE) {
        throw new RangeError(`scenario priors must sum to 1 (±1e-9), got ${sum}`);
      }
      return range(low, high);
    }
  }
}
