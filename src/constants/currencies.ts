/**
 * The currencies an amount may be held in.
 *
 * All of them have two decimal places, which is what lets an amount be a plain
 * integer of minor units everywhere it is read and written: a currency with a
 * different exponent - the yen has none - would need its own divisor at every
 * one of those points.
 */
export const CURRENCIES = [
    'EUR',
    'USD',
    'GBP',
    'CHF',
    'SEK',
    'NOK',
    'DKK',
    'PLN',
    'CZK',
    'CAD',
    'AUD',
] as const;

export type Currency = (typeof CURRENCIES)[number];
