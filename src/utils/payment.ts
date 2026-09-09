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

/**
 * The day a settled payment was settled on. Older rows were marked paid before
 * the day was recorded, so the day it was due stands in for them.
 */
export function settledOn(payment: PaymentItem): string {
    return payment.paidOn ?? payment.dueOn;
}

/**
 * What the family has actually paid in `month`, or null when no single figure
 * would be true: nothing settled, or amounts in more than one currency. A
 * currency is chosen per payment and nothing records a rate between two.
 */
export function paidInMonth(
    payments: PaymentItem[],
    month: string
): { amount: number; currency: Currency } | null {
    const settled = payments.filter(
        (one) => one.paid && settledOn(one).startsWith(month)
    );

    const [first] = settled;
    if (!first) return null;
    if (settled.some((one) => one.currency !== first.currency)) return null;

    return {
        amount: settled.reduce((sum, one) => sum + one.amount, 0),
        currency: first.currency,
    };
}

/** Soonest first, so what is overdue rises to the top. */
export function byDue(a: DueRow, b: DueRow): number {
    if (a.dueOn !== b.dueOn) return a.dueOn < b.dueOn ? -1 : 1;
    return a.name.localeCompare(b.name);
}
