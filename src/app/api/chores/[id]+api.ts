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
import { chore, familyMember } from '@/db/schema';
import {
    CHORE_COLUMNS,
    forbidden,
    isDay,
    MAX_LABEL_LENGTH,
} from '@/utils/content';

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
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const submitted = Object.keys(body);
    if (submitted.length === 0) {
        return Response.json({ error: 'Nothing to change' }, { status: 400 });
    }

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
        const { label } = body;
        if (typeof label !== 'string' || !label.trim()) {
            return Response.json(
                { error: 'A label is required' },
                { status: 400 }
            );
        }
        if (label.trim().length > MAX_LABEL_LENGTH) {
            return Response.json(
                { error: 'That label is too long' },
                { status: 400 }
            );
        }
        changes.label = label.trim();
    }

    if ('done' in body) {
        if (typeof body.done !== 'boolean') {
            return Response.json({ error: 'Invalid done' }, { status: 400 });
        }
        changes.done = body.done;
    }

    if ('day' in body) {
        const { day } = body;
        if (typeof day !== 'string' || !isDay(day)) {
            return Response.json({ error: 'Invalid day' }, { status: 400 });
        }
        changes.day = day;
    }

    if ('assigneeId' in body) {
        const { assigneeId } = body;
        if (assigneeId !== null && typeof assigneeId !== 'string') {
            return Response.json(
                { error: 'Invalid assignee' },
                { status: 400 }
            );
        }

        if (typeof assigneeId === 'string') {
            const [member] = await db
                .select({ id: familyMember.id })
                .from(familyMember)
                .where(
                    and(
                        eq(familyMember.id, assigneeId),
                        eq(familyMember.familyId, membership.familyId),
                        isNull(familyMember.deletedAt)
                    )
                )
                .limit(1);

            if (!member) {
                return Response.json(
                    { error: 'That member is not in your family' },
                    { status: 404 }
                );
            }
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
                /** A checker's rows, decided by the statement rather than by a read. */
                ...(checker ? [eq(chore.assigneeId, membership.memberId)] : [])
            )
        )
        .returning(CHORE_COLUMNS);

    if (updated.length === 0) {
        return Response.json(
            {
                error: checker
                    ? 'That chore is not yours to change'
                    : 'That chore is no longer there',
            },
            { status: 404 }
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
        return Response.json(
            { error: 'That chore is no longer there' },
            { status: 404 }
        );
    }

    return Response.json({ chore: { id: deleted[0].id } });
}
