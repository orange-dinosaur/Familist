/**
 * The order the to-dos are shown in, shared by the list and the home card so
 * that the card is a preview of the list rather than a second opinion.
 */

import { type TodoItem } from '@/constants/types';

const priorityRank = { high: 2, medium: 1, low: 0 } as const;

/**
 * Dated to-dos first and soonest first, so what is overdue rises to the top;
 * the undated ones after them, since a to-do with no date is not waiting on
 * anything. Priority separates the ones that fall on the same day, and the
 * sort being stable leaves the rest in the order the family made them.
 */
export function byUrgency(a: TodoItem, b: TodoItem): number {
    if (a.day !== b.day) {
        if (!a.day) return 1;
        if (!b.day) return -1;
        return a.day < b.day ? -1 : 1;
    }
    return priorityRank[b.priority] - priorityRank[a.priority];
}
