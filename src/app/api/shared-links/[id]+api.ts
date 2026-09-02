/**
 * One link. There is no checker allowlist here the way there is for to-dos: a
 * checker may not write to links at all, so both handlers refuse them outright.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    forbidden,
    noteError,
    notFound,
    SHARED_LINK_COLUMNS,
    titleError,
    urlError,
} from '@/db/content';
import { sharedLink } from '@/db/schema';
import { withScheme } from '@/utils/shared-link';

export async function PATCH(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You cannot change links');
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    if (Object.keys(body).length === 0) return badRequest('Nothing to change');

    const changes: {
        title?: string;
        url?: string;
        note?: string | null;
        createdBy?: string | null;
    } = {};

    if ('title' in body) {
        const invalid = titleError(body.title);
        if (invalid) return badRequest(invalid);
        changes.title = (body.title as string).trim();
    }

    /** A link written without a scheme is an `https` one, as it is on POST. */
    if ('url' in body) {
        const address =
            typeof body.url === 'string' ? withScheme(body.url) : body.url;
        const invalid = urlError(address);
        if (invalid) return badRequest(invalid);
        changes.url = address as string;
    }

    /** An emptied note is no note, which is what the column holds. */
    if ('note' in body) {
        const invalid = noteError(body.note);
        if (invalid) return badRequest(invalid);
        const trimmed = typeof body.note === 'string' ? body.note.trim() : '';
        changes.note = trimmed || null;
    }

    if ('createdBy' in body) {
        const { createdBy } = body;
        if (createdBy !== null && typeof createdBy !== 'string') {
            return badRequest('Invalid member');
        }
        if (
            typeof createdBy === 'string' &&
            !(await assigneeInFamily(membership.familyId, createdBy))
        ) {
            return notFound('That member is not in your family');
        }
        changes.createdBy = createdBy;
    }

    const updated = await db
        .update(sharedLink)
        .set(changes)
        .where(
            and(
                eq(sharedLink.id, id),
                eq(sharedLink.familyId, membership.familyId),
                isNull(sharedLink.deletedAt)
            )
        )
        .returning(SHARED_LINK_COLUMNS);

    if (updated.length === 0) {
        return notFound('That link is no longer there');
    }

    return Response.json({ sharedLink: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You cannot change links');
    }

    const deleted = await db
        .update(sharedLink)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(sharedLink.id, id),
                eq(sharedLink.familyId, membership.familyId),
                isNull(sharedLink.deletedAt)
            )
        )
        .returning({ id: sharedLink.id });

    if (deleted.length === 0) {
        return notFound('That link is no longer there');
    }

    return Response.json({ sharedLink: { id: deleted[0].id } });
}
