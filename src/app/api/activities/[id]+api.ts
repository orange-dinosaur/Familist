/**
 * One activity. `lastDoneOn` is the "done today" of this collection, so it is
 * the one field a checker may write - the allowlist here does the whole job,
 * since an activity has no assignee for a row condition to be built from.
 *
 * A null clears it, which is how a date written by mistake is taken back.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    ACTIVITY_COLUMNS,
    badRequest,
    emojiError,
    forbidden,
    nameError,
    notFound,
    optionalDayError,
} from '@/db/content';
import { activity } from '@/db/schema';

export async function PATCH(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const submitted = Object.keys(body);
    if (submitted.length === 0) return badRequest('Nothing to change');

    if (
        membership.role === 'checker' &&
        submitted.some((field) => field !== 'lastDoneOn')
    ) {
        return forbidden('You can only mark activities done');
    }

    const changes: {
        name?: string;
        emoji?: string;
        lastDoneOn?: string | null;
    } = {};

    if ('name' in body) {
        const invalid = nameError(body.name);
        if (invalid) return badRequest(invalid);
        changes.name = (body.name as string).trim();
    }

    if ('emoji' in body) {
        const invalid = emojiError(body.emoji);
        if (invalid) return badRequest(invalid);
        changes.emoji = body.emoji as string;
    }

    if ('lastDoneOn' in body) {
        const invalid = optionalDayError(body.lastDoneOn);
        if (invalid) return badRequest(invalid);
        changes.lastDoneOn =
            typeof body.lastDoneOn === 'string' ? body.lastDoneOn : null;
    }

    const updated = await db
        .update(activity)
        .set(changes)
        .where(
            and(
                eq(activity.id, id),
                eq(activity.familyId, membership.familyId),
                isNull(activity.deletedAt)
            )
        )
        .returning(ACTIVITY_COLUMNS);

    if (updated.length === 0) {
        return notFound('That activity is no longer there');
    }

    return Response.json({ activity: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only mark activities done');
    }

    const deleted = await db
        .update(activity)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(activity.id, id),
                eq(activity.familyId, membership.familyId),
                isNull(activity.deletedAt)
            )
        )
        .returning({ id: activity.id });

    if (deleted.length === 0) {
        return notFound('That activity is no longer there');
    }

    return Response.json({ activity: { id: deleted[0].id } });
}
