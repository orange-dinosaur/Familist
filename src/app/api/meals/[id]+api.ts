/**
 * One meal. Every field is an ordinary editable one, and a checker may change
 * none of them: without a `done` column there is nothing here they are allowed
 * to touch, so the row condition the chore and to-do routes fold into their
 * `WHERE` is replaced by refusing the request outright.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type MealItem } from '@/constants/types';
import { db } from '@/db';
import {
    badRequest,
    dayError,
    emojiError,
    forbidden,
    MEAL_COLUMNS,
    nameError,
    notFound,
    timeError,
} from '@/db/content';
import { meal } from '@/db/schema';

export async function PATCH(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('Meals are not yours to change');
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    if (Object.keys(body).length === 0) return badRequest('Nothing to change');

    const changes: {
        name?: string;
        time?: MealItem['time'];
        emoji?: string;
        day?: string;
    } = {};

    if ('name' in body) {
        const invalid = nameError(body.name);
        if (invalid) return badRequest(invalid);
        changes.name = (body.name as string).trim();
    }

    if ('time' in body) {
        const invalid = timeError(body.time);
        if (invalid) return badRequest(invalid);
        changes.time = body.time as MealItem['time'];
    }

    if ('emoji' in body) {
        const invalid = emojiError(body.emoji);
        if (invalid) return badRequest(invalid);
        changes.emoji = body.emoji as string;
    }

    if ('day' in body) {
        const invalid = dayError(body.day);
        if (invalid) return badRequest(invalid);
        changes.day = body.day as string;
    }

    const updated = await db
        .update(meal)
        .set(changes)
        .where(
            and(
                eq(meal.id, id),
                eq(meal.familyId, membership.familyId),
                isNull(meal.deletedAt)
            )
        )
        .returning(MEAL_COLUMNS);

    if (updated.length === 0) {
        return notFound('That meal is no longer there');
    }

    return Response.json({ meal: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('Meals are not yours to change');
    }

    const deleted = await db
        .update(meal)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(meal.id, id),
                eq(meal.familyId, membership.familyId),
                isNull(meal.deletedAt)
            )
        )
        .returning({ id: meal.id });

    if (deleted.length === 0) {
        return notFound('That meal is no longer there');
    }

    return Response.json({ meal: { id: deleted[0].id } });
}
