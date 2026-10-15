import type { FreeIssueKey, IssueKey, Role, WeightProfile } from '@vivienda/schemas';

/** Free-tier weight profiles, also used as counterpart priors (R-03.4). */
export const WEIGHT_PRESETS: Readonly<
  Record<WeightProfile, Readonly<Record<FreeIssueKey, number>>>
> = {
  price_first: { price: 0.6, closingDays: 0.2, costs: 0.2 },
  speed_first: { price: 0.35, closingDays: 0.45, costs: 0.2 },
  balanced: { price: 0.45, closingDays: 0.3, costs: 0.25 },
};

type OrdinalIssue = Extract<IssueKey, 'costs' | 'mortgageContingency' | 'furniture'>;

/** Default ordinal score tables per role, overridable by the user (R-03.8). */
export const DEFAULT_ORDINAL_SCORES: Readonly<
  Record<Role, Readonly<Record<OrdinalIssue, Readonly<Record<string, number>>>>>
> = {
  buyer: {
    costs: { buyer: 0, split: 50, seller: 100 },
    mortgageContingency: { no: 0, yes: 100 },
    furniture: { none: 0, partial: 50, all: 100 },
  },
  seller: {
    costs: { buyer: 100, split: 50, seller: 0 },
    mortgageContingency: { no: 100, yes: 0 },
    furniture: { none: 100, partial: 50, all: 0 },
  },
};
