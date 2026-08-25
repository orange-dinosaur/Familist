/**
 * Shared pieces of the content routes - meals, chores and todos.
 */

import { chore } from '@/db/schema';

export const MAX_LABEL_LENGTH = 200;

/** The columns a client is given. `family_id` and the timestamps stay here. */
export const CHORE_COLUMNS = {
    id: chore.id,
    label: chore.label,
    done: chore.done,
    assigneeId: chore.assigneeId,
    day: chore.day,
};

/** A `date` column round-trips as `YYYY-MM-DD`, so that is what is accepted. */
export function isDay(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
}

export function forbidden(error: string): Response {
    return Response.json({ error }, { status: 403 });
}
