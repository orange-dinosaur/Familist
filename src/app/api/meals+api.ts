/**
 * Meals: a name, a time of day and an emoji, and the same four scoping rules
 * from `.notes/data_management/familist-adaptation.md`.
 *
 * The one collection with nothing for a checker to do. There is no `done` and
 * no assignee, so the narrow permission from `.notes/roles.md` has no field to
 * apply to and a checker only ever reads.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type MealItem } from '@/constants/types';
import { db } from '@/db';
import {
    badRequest,
    dayError,
    emojiError,
    forbidden,
    idError,
    MEAL_COLUMNS,
    nameError,
    readSince,
    retriedCreate,
    timeError,
} from '@/db/content';
import { meal } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    /**
     * A pg enum sorts by the order its values were declared, which for
     * `meal_time` is the order of the day, so a day's meals come back in the
     * order they are eaten.
     */
    const meals = await db
        .select(MEAL_COLUMNS)
        .from(meal)
        .where(
            and(
                eq(meal.familyId, membership.familyId),
                since ? gte(meal.updatedAt, since) : isNull(meal.deletedAt)
            )
        )
        .orderBy(
            asc(meal.day),
            asc(meal.time),
            asc(meal.createdAt),
            asc(meal.id)
        );

    return Response.json({ meals });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('Meals are not yours to change');
    }

    let body: {
        id?: unknown;
        name?: unknown;
        time?: unknown;
        emoji?: unknown;
        day?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, name, time, emoji, day } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    const invalid = nameError(name) ?? timeError(time) ?? dayError(day);
    if (invalid) return badRequest(invalid);

    if (emoji !== undefined) {
        const invalidEmoji = emojiError(emoji);
        if (invalidEmoji) return badRequest(invalidEmoji);
    }

    const [created] = await db
        .insert(meal)
        .values({
            id: recordId,
            familyId: membership.familyId,
            name: (name as string).trim(),
            time: time as MealItem['time'],
            emoji: emoji === undefined ? '' : (emoji as string),
            day: day as string,
        })
        .onConflictDoNothing()
        .returning(MEAL_COLUMNS);

    if (created) return Response.json({ meal: created }, { status: 201 });

    return retriedCreate(
        meal,
        MEAL_COLUMNS,
        'meal',
        recordId,
        membership.familyId
    );
}
