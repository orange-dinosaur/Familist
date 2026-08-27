/**
 * Shared pieces of the content routes - meals, chores and todos.
 *
 * Server only, and here rather than in `utils/` for the reason `MemberRole`
 * moved the other way in 19b: this reaches the schema and the pool, so a client
 * module importing it by mistake would pull drizzle into the bundle.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { type PgColumn } from 'drizzle-orm/pg-core';

import { db } from '@/db';
import { chore, choreDefinition, familyMember, meal, todo } from '@/db/schema';
import { type MealItem, type TodoItem } from '@/constants/types';
import { createId } from '@/utils/id';

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

/**
 * The columns a client is given. `family_id` and `created_at` stay here;
 * `updated_at` and `deleted_at` go out because a synced client reconciles on
 * them - it needs to know which of two versions is newer, and that a record it
 * still holds has since been deleted.
 */
export const MEAL_COLUMNS = {
    id: meal.id,
    name: meal.name,
    time: meal.time,
    emoji: meal.emoji,
    day: meal.day,
    updatedAt: meal.updatedAt,
    deletedAt: meal.deletedAt,
};

export const CHORE_DEFINITION_COLUMNS = {
    id: choreDefinition.id,
    name: choreDefinition.name,
    createdBy: choreDefinition.createdBy,
    updatedAt: choreDefinition.updatedAt,
    deletedAt: choreDefinition.deletedAt,
};

export const CHORE_COLUMNS = {
    id: chore.id,
    definitionId: chore.definitionId,
    done: chore.done,
    active: chore.active,
    assigneeId: chore.assigneeId,
    day: chore.day,
    updatedAt: chore.updatedAt,
    deletedAt: chore.deletedAt,
};

export const TODO_COLUMNS = {
    id: todo.id,
    label: todo.label,
    done: todo.done,
    priority: todo.priority,
    assigneeId: todo.assigneeId,
    day: todo.day,
    updatedAt: todo.updatedAt,
    deletedAt: todo.deletedAt,
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

/**
 * A to-do's day is a due date it may not have, so nothing at all passes. The
 * two are separate validators rather than a flag because the collections that
 * are keyed by day must keep refusing a record without one.
 */
export function dueDayError(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return dayError(value);
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

/**
 * Whether a day may be planned from this chore, which is the same question as
 * whether the family has it. Like `assigneeInFamily`, the composite foreign
 * key would refuse it anyway; this turns that into an answer.
 */
export async function choreDefinitionInFamily(
    familyId: string,
    definitionId: string
): Promise<boolean> {
    const [definition] = await db
        .select({ id: choreDefinition.id })
        .from(choreDefinition)
        .where(
            and(
                eq(choreDefinition.id, definitionId),
                eq(choreDefinition.familyId, familyId),
                isNull(choreDefinition.deletedAt)
            )
        )
        .limit(1);

    return definition !== undefined;
}

/**
 * The family's chore of this name, added if they have none. It is how a day
 * entry that names its chore rather than pointing at one still gets planned:
 * a device carrying entries from before the family kept its own chores brings
 * a name and nothing else.
 */
export async function choreDefinitionNamed(
    familyId: string,
    name: string,
    memberId: string
): Promise<string> {
    const [existing] = await db
        .select({ id: choreDefinition.id })
        .from(choreDefinition)
        .where(
            and(
                eq(choreDefinition.familyId, familyId),
                eq(choreDefinition.name, name),
                isNull(choreDefinition.deletedAt)
            )
        )
        .limit(1);

    if (existing) return existing.id;

    const [created] = await db
        .insert(choreDefinition)
        .values({
            id: createId(),
            familyId,
            name,
            createdBy: memberId,
        })
        .returning({ id: choreDefinition.id });

    return created.id;
}

/**
 * Length and shape only. A record id is a primary key, not a secret: family
 * scoping is what keeps one family out of another's rows, so a client that
 * mints its own - which it must, to create a record before it can reach the
 * server - only has to produce a plausible key.
 */
const ID_PATTERN = /^[a-z0-9-]{1,64}$/;

export function idError(value: unknown): string | null {
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
        return 'Invalid id';
    }
    return null;
}

/**
 * `?since=` turns a read into an incremental one: everything the family has
 * touched after that instant, tombstones included, so a puller learns about
 * deletions as well as edits. Absent, the read is the live collection.
 *
 * The value has to be one the server itself sent - the largest `updated_at`
 * the caller has seen - rather than a client clock, which would drift and skip
 * records.
 *
 * The comparison is inclusive, so the caller is handed back the records it
 * already has at exactly that instant. That is deliberate: `updated_at` is
 * written from JS and has millisecond resolution, so several rows touched in
 * one burst can share a timestamp, and an exclusive bound would lose every one
 * of them but the one that set the mark. Re-sending them costs a record or two
 * per read and reconciles to the same result.
 */
export function readSince(request: Request): {
    at: Date | null;
    error: string | null;
} {
    const raw = new URL(request.url).searchParams.get('since');
    if (raw === null) return { at: null, error: null };

    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) {
        return { at: null, error: 'Invalid since' };
    }

    return { at, error: null };
}

/**
 * A `POST` whose id was already taken. Almost always a client resending a
 * create it never heard the answer to, so the record it asked for is handed
 * back and the retry is a no-op rather than an error. An id that belongs to
 * another family is not that, and is refused without saying whose it is.
 */
export async function retriedCreate(
    table: typeof meal | typeof chore | typeof choreDefinition | typeof todo,
    columns: Record<string, PgColumn>,
    key: string,
    id: string,
    familyId: string
): Promise<Response> {
    const [existing] = await db
        .select(columns)
        .from(table)
        .where(and(eq(table.id, id), eq(table.familyId, familyId)))
        .limit(1);

    if (!existing) return badRequest('That id is taken');

    return Response.json({ [key]: existing });
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
