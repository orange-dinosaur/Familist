/**
 * The order the subscriptions are shown in, and how a cycle is written.
 */

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
