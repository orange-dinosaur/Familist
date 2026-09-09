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

/**
 * The finished list, most recently ticked off first. A to-do completed before
 * the app kept the time has none, and goes to the bottom - nothing knows when
 * it was done.
 */
export function byCompletion(a: TodoItem, b: TodoItem): number {
    if (!a.completedAt) return b.completedAt ? 1 : 0;
    if (!b.completedAt) return -1;
    return a.completedAt < b.completedAt ? 1 : -1;
}

export type TodoSort = 'urgency' | 'priority' | 'assignee' | 'added';

export const TODO_SORTS: { key: TodoSort; label: string }[] = [
    { key: 'urgency', label: 'Urgency' },
    { key: 'priority', label: 'Priority' },
    { key: 'assignee', label: 'Person' },
    { key: 'added', label: 'Added' },
];

/**
 * Every order falls back on urgency for what it cannot separate, so a sort is
 * a way of gathering the list rather than a different list each time.
 *
 * `added` is the collection as it arrives, which the route hands back in the
 * order the family made them. Nothing else here needs a copy of `createdAt` on
 * the device, which is why none is kept.
 */
export function sortTodos(
    todos: TodoItem[],
    sort: TodoSort,
    memberOrder: string[]
): TodoItem[] {
    if (sort === 'added') return todos;

    const list = [...todos];

    if (sort === 'priority') {
        return list.sort(
            (a, b) =>
                priorityRank[b.priority] - priorityRank[a.priority] ||
                byUrgency(a, b)
        );
    }

    if (sort === 'assignee') {
        /** Whoever a to-do is nobody's goes last, after every member. */
        const place = (todo: TodoItem) => {
            const at = todo.assigneeId
                ? memberOrder.indexOf(todo.assigneeId)
                : -1;
            return at === -1 ? memberOrder.length : at;
        };
        return list.sort((a, b) => place(a) - place(b) || byUrgency(a, b));
    }

    return list.sort(byUrgency);
}
