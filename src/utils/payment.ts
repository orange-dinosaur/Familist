/**
 * The rows the Payments screen shows, and how a subscription renewal moves on.
 *
 * A renewal is never stored as a payment. The screen builds one row per
 * subscription from its `nextRenewal`, and ticking that row moves the
 * subscription's own date on by a cycle - so nothing is generated in the
 * background and nothing can drift out of step with the subscription.
 */

import { formatDateString } from '@/constants/dates';
import { type Currency } from '@/constants/currencies';
import { type PaymentItem, type SubscriptionItem } from '@/constants/types';

/**
 * One line of the list. Exactly one of `payment` and `subscription` is set,
 * which is what decides where a tick goes.
 */
export interface DueRow {
    key: string;
    name: string;
    emoji: string;
    amount: number;
    currency: Currency;
    dueOn: string;
    paid: boolean;
    payerId?: string | null;
    payment: PaymentItem | null;
    subscription: SubscriptionItem | null;
}

/** How many days February and the rest have, so a renewal cannot overshoot. */
function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * One cycle on from `day`. A date that does not exist in the month it lands in
 * is pulled back to that month's last day, so a renewal on the 31st stays at
 * the end of the month rather than sliding into the next one.
 */
export function nextRenewalAfter(
    day: string,
    cycle: SubscriptionItem['cycle']
): string {
    const [year, month, date] = day.split('-').map(Number);

    if (cycle === 'weekly') {
        const moved = new Date(year, month - 1, date + 7);
        return formatDateString(moved);
    }

    const months = cycle === 'monthly' ? 1 : 12;
    const target = new Date(year, month - 1 + months, 1);
    const lastDay = daysInMonth(target.getFullYear(), target.getMonth());
    target.setDate(Math.min(date, lastDay));
    return formatDateString(target);
}

export function paymentRow(payment: PaymentItem): DueRow {
    return {
        key: payment.id,
        name: payment.name,
        emoji: '',
        amount: payment.amount,
        currency: payment.currency,
        dueOn: payment.dueOn,
        paid: payment.paid,
        payerId: payment.payerId,
        payment,
        subscription: null,
    };
}

/** A renewal that has been paid has already moved on, so one is never paid. */
export function renewalRow(subscription: SubscriptionItem): DueRow {
    return {
        key: `renewal:${subscription.id}`,
        name: subscription.name,
        emoji: subscription.emoji,
        amount: subscription.amount,
        currency: subscription.currency,
        dueOn: subscription.nextRenewal,
        paid: false,
        payerId: subscription.payerId,
        payment: null,
        subscription,
    };
}

/** Soonest first, so what is overdue rises to the top. */
export function byDue(a: DueRow, b: DueRow): number {
    if (a.dueOn !== b.dueOn) return a.dueOn < b.dueOn ? -1 : 1;
    return a.name.localeCompare(b.name);
}
