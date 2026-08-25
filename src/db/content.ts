/**
 * Shared pieces of the content routes - meals, chores and todos.
 *
 * Server only, and here rather than in `utils/` for the reason `MemberRole`
 * moved the other way in 19b: this reaches the schema and the pool, so a client
 * module importing it by mistake would pull drizzle into the bundle.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { chore, familyMember, meal, todo } from '@/db/schema';
import { type MealItem, type TodoItem } from '@/constants/mock-data';

export const MAX_LABEL_LENGTH = 200;

/**
 * Long enough for the sequences that render as one glyph - a family emoji is
 * eleven code units - and short enough that the column stays an emoji.
 */
export const MAX_EMOJI_LENGTH = 16;

export const MEAL_TIMES: MealItem['time'][] = [
    'breakfast',
    'lunch',
    'snack',
    'dinner',
];

export const TODO_PRIORITIES: TodoItem['priority'][] = [
    'low',
    'medium',
    'high',
];

/** The columns a client is given. `family_id` and the timestamps stay here. */
export const MEAL_COLUMNS = {
    id: meal.id,
    name: meal.name,
    time: meal.time,
    emoji: meal.emoji,
    day: meal.day,
};

export const CHORE_COLUMNS = {
    id: chore.id,
    label: chore.label,
    done: chore.done,
    assigneeId: chore.assigneeId,
    day: chore.day,
};

export const TODO_COLUMNS = {
    id: todo.id,
    label: todo.label,
    done: todo.done,
    priority: todo.priority,
    assigneeId: todo.assigneeId,
    day: todo.day,
};

/**
 * The validators answer with the message the client should see, or null. Each
 * one covers both a missing value and a malformed one, so `POST` and `PATCH`
 * can share them: the difference between the two is only which fields they
 * look at.
 */
function textError(value: unknown, noun: string): string | null {
    if (typeof value !== 'string' || !value.trim())
        return `A ${noun} is required`;
    if (value.trim().length > MAX_LABEL_LENGTH)
        return `That ${noun} is too long`;
    return null;
}

export function labelError(value: unknown): string | null {
    return textError(value, 'label');
}

/** Meals carry a name where chores and todos carry a label. */
export function nameError(value: unknown): string | null {
    return textError(value, 'name');
}

/** A `date` column round-trips as `YYYY-MM-DD`, so that is what is accepted. */
export function dayError(value: unknown): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'A day is required';
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
    ) {
        return 'That is not a real date';
    }
    return null;
}

export function timeError(value: unknown): string | null {
    if (value === undefined || value === null) return 'A time is required';
    if (
        typeof value !== 'string' ||
        !MEAL_TIMES.includes(value as MealItem['time'])
    ) {
        return 'Unknown time';
    }
    return null;
}

/**
 * The column is `NOT NULL DEFAULT ''`, so no emoji is a valid meal - only a
 * value of the wrong shape is refused.
 */
export function emojiError(value: unknown): string | null {
    if (typeof value !== 'string') return 'Invalid emoji';
    if (value.length > MAX_EMOJI_LENGTH) return 'That emoji is too long';
    return null;
}

export function priorityError(value: unknown): string | null {
    if (value === undefined || value === null) return 'A priority is required';
    if (
        typeof value !== 'string' ||
        !TODO_PRIORITIES.includes(value as TodoItem['priority'])
    ) {
        return 'Unknown priority';
    }
    return null;
}

/**
 * The composite foreign key already refuses an assignee from another family,
 * but as a constraint violation. This turns that into an answer - it is the
 * message, not the boundary.
 */
export async function assigneeInFamily(
    familyId: string,
    assigneeId: string
): Promise<boolean> {
    const [member] = await db
        .select({ id: familyMember.id })
        .from(familyMember)
        .where(
            and(
                eq(familyMember.id, assigneeId),
                eq(familyMember.familyId, familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    return member !== undefined;
}

export function badRequest(error: string): Response {
    return Response.json({ error }, { status: 400 });
}

export function forbidden(error: string): Response {
    return Response.json({ error }, { status: 403 });
}

export function notFound(error: string): Response {
    return Response.json({ error }, { status: 404 });
}
