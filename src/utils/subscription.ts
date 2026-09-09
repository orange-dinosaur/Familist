/**
 * The order the subscriptions are shown in, how a cycle is written, and what
 * the family pays across a month.
 */

import { type Currency } from '@/constants/currencies';
import { type SubscriptionItem } from '@/constants/types';

export const SUBSCRIPTION_CYCLES: {
    key: SubscriptionItem['cycle'];
    label: string;
}[] = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
];

export function cycleLabel(cycle: SubscriptionItem['cycle']): string {
    return SUBSCRIPTION_CYCLES.find(({ key }) => key === cycle)?.label ?? '';
}

/** Soonest renewal first, so what is about to be charged rises to the top. */
export function byRenewal(a: SubscriptionItem, b: SubscriptionItem): number {
    if (a.nextRenewal !== b.nextRenewal) {
        return a.nextRenewal < b.nextRenewal ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
}

/** A week is a twelfth of fifty-two, which is how a year divides into months. */
const WEEKS_PER_MONTH = 52 / 12;

/**
 * What the family pays in a month, in minor units, with every cycle brought to
 * a monthly figure. A currency is chosen per subscription and nothing records
 * a rate between two of them, so a family paying in more than one has no single
 * total and gets none: null is "there is no honest answer", not "nothing".
 */
export function monthlyTotal(
    subscriptions: SubscriptionItem[]
): { amount: number; currency: Currency } | null {
    const [first] = subscriptions;
    if (!first) return null;
    if (subscriptions.some((one) => one.currency !== first.currency)) {
        return null;
    }

    const amount = subscriptions.reduce((sum, one) => {
        if (one.cycle === 'weekly') return sum + one.amount * WEEKS_PER_MONTH;
        if (one.cycle === 'yearly') return sum + one.amount / 12;
        return sum + one.amount;
    }, 0);

    return { amount: Math.round(amount), currency: first.currency };
}
