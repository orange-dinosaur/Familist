/**
 * One chore. `PATCH` changes it, `DELETE` soft-deletes it.
 *
 * This is where a checker's permission is actually enforced, and it is not a
 * permission on the *operation*: per `.notes/data_management/roles.md` it is
 * which fields may change (`done`, nothing else) **and** which rows (only those
 * assigned to them). The row condition goes into the `WHERE` rather than being
 * read first and written second, which would race.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    CHORE_COLUMNS,
    dayError,
    forbidden,
    labelError,
    notFound,
} from '@/db/content';
import { chore } from '@/db/schema';

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

    const checker = membership.role === 'checker';

    if (checker && submitted.some((field) => field !== 'done')) {
        return forbidden('You can only tick chores off');
    }

    const changes: {
        label?: string;
        done?: boolean;
        day?: string;
        assigneeId?: string | null;
    } = {};

    if ('label' in body) {
        const invalid = labelError(body.label);
        if (invalid) return badRequest(invalid);
        changes.label = (body.label as string).trim();
    }

    if ('done' in body) {
        if (typeof body.done !== 'boolean') return badRequest('Invalid done');
        changes.done = body.done;
    }

    if ('day' in body) {
        const invalid = dayError(body.day);
        if (invalid) return badRequest(invalid);
        changes.day = body.day as string;
    }

    if ('assigneeId' in body) {
        const { assigneeId } = body;
        if (assigneeId !== null && typeof assigneeId !== 'string') {
            return badRequest('Invalid assignee');
        }
        if (
            typeof assigneeId === 'string' &&
            !(await assigneeInFamily(membership.familyId, assigneeId))
        ) {
            return notFound('That member is not in your family');
        }
        changes.assigneeId = assigneeId;
    }

    const updated = await db
        .update(chore)
        .set(changes)
        .where(
            and(
                eq(chore.id, id),
                eq(chore.familyId, membership.familyId),
                isNull(chore.deletedAt),
                /** A checker's rows, decided by the statement rather than a read. */
                ...(checker ? [eq(chore.assigneeId, membership.memberId)] : [])
            )
        )
        .returning(CHORE_COLUMNS);

    if (updated.length === 0) {
        return notFound(
            checker
                ? 'That chore is not yours to change'
                : 'That chore is no longer there'
        );
    }

    return Response.json({ chore: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick chores off');
    }

    const deleted = await db
        .update(chore)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(chore.id, id),
                eq(chore.familyId, membership.familyId),
                isNull(chore.deletedAt)
            )
        )
        .returning({ id: chore.id });

    if (deleted.length === 0) {
        return notFound('That chore is no longer there');
    }

    return Response.json({ chore: { id: deleted[0].id } });
}
