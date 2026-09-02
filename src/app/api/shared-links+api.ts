/**
 * The links the family keep, with the same four scoping rules as the other
 * collections and the subscriptions rule of their own: a checker may not write
 * to them at all. A link has no "done" to tick, so there is nothing here that
 * falls within what a checker may touch.
 *
 * A link written without a scheme is taken as an `https` one, here rather than
 * on the device, so every client is held to the same rule and the record the
 * device settles on is the address the family will be handed.
 *
 * `createdBy` defaults to the caller - it is who kept the link - but is taken
 * from the body when it is given, so a link kept on somebody else's behalf can
 * say whose it is.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    forbidden,
    idError,
    noteError,
    notFound,
    readSince,
    retriedCreate,
    SHARED_LINK_COLUMNS,
    titleError,
    urlError,
} from '@/db/content';
import { sharedLink } from '@/db/schema';
import { createId } from '@/utils/id';
import { withScheme } from '@/utils/shared-link';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const sharedLinks = await db
        .select(SHARED_LINK_COLUMNS)
        .from(sharedLink)
        .where(
            and(
                eq(sharedLink.familyId, membership.familyId),
                since
                    ? gte(sharedLink.updatedAt, since)
                    : isNull(sharedLink.deletedAt)
            )
        )
        .orderBy(asc(sharedLink.title), asc(sharedLink.id));

    return Response.json({ sharedLinks });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You cannot change links');
    }

    let body: {
        id?: unknown;
        title?: unknown;
        url?: unknown;
        note?: unknown;
        createdBy?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, title, url, note, createdBy } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    /** A link written without one is an `https` link, not a refusal. */
    const address = typeof url === 'string' ? withScheme(url) : url;

    const invalid = titleError(title) ?? urlError(address) ?? noteError(note);
    if (invalid) return badRequest(invalid);

    if (
        createdBy !== undefined &&
        createdBy !== null &&
        typeof createdBy !== 'string'
    ) {
        return badRequest('Invalid member');
    }

    if (
        typeof createdBy === 'string' &&
        !(await assigneeInFamily(membership.familyId, createdBy))
    ) {
        return notFound('That member is not in your family');
    }

    /** Absent means the caller; null is the family saying nobody. */
    const keeper = createdBy === undefined ? membership.memberId : createdBy;

    const trimmedNote = typeof note === 'string' ? note.trim() : '';

    const [created] = await db
        .insert(sharedLink)
        .values({
            id: recordId,
            familyId: membership.familyId,
            title: (title as string).trim(),
            url: address as string,
            note: trimmedNote || null,
            createdBy: keeper,
        })
        .onConflictDoNothing()
        .returning(SHARED_LINK_COLUMNS);

    if (created) return Response.json({ sharedLink: created }, { status: 201 });

    return retriedCreate(
        sharedLink,
        SHARED_LINK_COLUMNS,
        'sharedLink',
        recordId,
        membership.familyId
    );
}
