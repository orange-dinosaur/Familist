/**
 * The things the family wants to know when they last did, with the same four
 * scoping rules as the other collections.
 *
 * An activity has no assignee, so the checker rule cannot be the one the
 * to-do routes use. What stands in for it is the field allowlist alone:
 * `lastDoneOn` is the "done today" of this collection, and it is all a checker
 * may write. Creating and deleting stay with owners and editors.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    ACTIVITY_COLUMNS,
    badRequest,
    emojiError,
    forbidden,
    idError,
    nameError,
    optionalDayError,
    readSince,
    retriedCreate,
} from '@/db/content';
import { activity } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const activities = await db
        .select(ACTIVITY_COLUMNS)
        .from(activity)
        .where(
            and(
                eq(activity.familyId, membership.familyId),
                since
                    ? gte(activity.updatedAt, since)
                    : isNull(activity.deletedAt)
            )
        )
        /** In the order the family made them; the screen sorts for itself. */
        .orderBy(asc(activity.createdAt), asc(activity.id));

    return Response.json({ activities });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only mark activities done');
    }

    let body: {
        id?: unknown;
        name?: unknown;
        emoji?: unknown;
        lastDoneOn?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, name, emoji, lastDoneOn } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    const invalid = nameError(name) ?? optionalDayError(lastDoneOn);
    if (invalid) return badRequest(invalid);

    /** The column is `NOT NULL DEFAULT ''`, so no emoji is a valid one. */
    if (emoji !== undefined) {
        const invalidEmoji = emojiError(emoji);
        if (invalidEmoji) return badRequest(invalidEmoji);
    }

    const [created] = await db
        .insert(activity)
        .values({
            id: recordId,
            familyId: membership.familyId,
            name: (name as string).trim(),
            emoji: typeof emoji === 'string' ? emoji : '',
            lastDoneOn: typeof lastDoneOn === 'string' ? lastDoneOn : null,
        })
        .onConflictDoNothing()
        .returning(ACTIVITY_COLUMNS);

    if (created) return Response.json({ activity: created }, { status: 201 });

    return retriedCreate(
        activity,
        ACTIVITY_COLUMNS,
        'activity',
        recordId,
        membership.familyId
    );
}
