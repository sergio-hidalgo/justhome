/**
 * Engine model parameters (issue 001): named constants, each citing its requirement.
 * Changing one is an engine change: bump ENGINE_VERSION (R-08.4).
 * Market data never lives here; it arrives through `EngineInput.market`.
 */

/** Days in one BATNA horizon month, used to compare `alternativeExpiresInDays` (R-04.5). */
export const DAYS_PER_MONTH = 30;

/** Horizons, in months, at which the own BATNA is reported (R-04.4). */
export const BATNA_HORIZON_MONTHS = [1, 3, 6] as const;
