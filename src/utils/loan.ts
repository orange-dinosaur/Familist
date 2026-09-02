/**
 * The order the loans are shown in, and how a direction is written.
 */

import { type LoanItem } from '@/constants/types';

export const LOAN_DIRECTIONS: {
    key: LoanItem['direction'];
    label: string;
}[] = [
    { key: 'lent', label: 'Lent out' },
    { key: 'borrowed', label: 'Borrowed' },
];

export function directionLabel(direction: LoanItem['direction']): string {
    return LOAN_DIRECTIONS.find(({ key }) => key === direction)?.label ?? '';
}

/** "To" for something the family lent out, "From" for something borrowed. */
export function counterpartyLabel(direction: LoanItem['direction']): string {
    return direction === 'lent' ? 'To' : 'From';
}

/** Longest out first, so what has been away the longest is at the top. */
export function byDay(a: LoanItem, b: LoanItem): number {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    return a.item.localeCompare(b.item);
}
