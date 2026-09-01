/**
 * Amounts are held as an integer of minor units everywhere - in the column, on
 * the wire and in the store - and only become a decimal at the two edges: the
 * string a screen shows, and the string somebody typed.
 */

import { type Currency } from '@/constants/currencies';

/** Every accepted currency has two decimal places, so one divisor serves all. */
const MINOR_UNITS = 100;

/**
 * Hermes does not always ship the currency data `NumberFormat` needs, so the
 * code stands in for the symbol where it is missing.
 */
export function formatAmount(amount: number, currency: Currency): string {
    const major = amount / MINOR_UNITS;
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(major);
    } catch {
        return `${major.toFixed(2)} ${currency}`;
    }
}

/**
 * What somebody typed, in minor units, or null if it is not an amount. A comma
 * is accepted as the decimal separator, which is what most of the accepted
 * currencies are written with.
 */
export function parseAmount(text: string): number | null {
    const typed = text.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(typed)) return null;
    return Math.round(Number(typed) * MINOR_UNITS);
}
