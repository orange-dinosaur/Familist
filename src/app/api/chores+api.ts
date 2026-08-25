/**
 * Chores. The four rules from `.notes/data_management/familist-adaptation.md`
 * apply to every handler here: the session is re-fetched per request, reads are
 * filtered by the caller's `family_id`, writes stamp it from the session rather
 * than the body, and updates and deletes match on record id **and**
 * `family_id`. There is no row-level security underneath.
 *
 * Reads are unrestricted inside a family. Creating is for owners and editors:
 * a checker may only tick off what is assigned to them, which is enforced in
 * `chores/[id]`.
 */

import { and, asc, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { chore, familyMember } from '@/db/schema';
import { createId } from '@/utils/id';
import {
    forbidden,
    isDay,
    MAX_LABEL_LENGTH,
    CHORE_COLUMNS,
} from '@/utils/content';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const chores = await db
        .select(CHORE_COLUMNS)
        .from(chore)
        .where(
            and(
                eq(chore.familyId, membership.familyId),
                isNull(chore.deletedAt)
            )
        )
        .orderBy(asc(chore.day), asc(chore.createdAt), asc(chore.id));

    return Response.json({ chores });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick off what is assigned to you');
    }

    let body: { label?: unknown; day?: unknown; assigneeId?: unknown };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { label, day, assigneeId } = body;

    if (typeof label !== 'string' || !label.trim()) {
        return Response.json({ error: 'A label is required' }, { status: 400 });
    }
    if (label.trim().length > MAX_LABEL_LENGTH) {
        return Response.json(
            { error: 'That label is too long' },
            { status: 400 }
        );
    }
    if (typeof day !== 'string' || !isDay(day)) {
        return Response.json({ error: 'A day is required' }, { status: 400 });
    }
    if (
        assigneeId !== undefined &&
        assigneeId !== null &&
        typeof assigneeId !== 'string'
    ) {
        return Response.json({ error: 'Invalid assignee' }, { status: 400 });
    }

    const assignee = typeof assigneeId === 'string' ? assigneeId : null;

    if (assignee) {
        /**
         * Scoped by the caller's family, like every other lookup. The composite
         * foreign key would refuse a member of another family anyway, but as a
         * 500 rather than an answer.
         */
        const [member] = await db
            .select({ id: familyMember.id })
            .from(familyMember)
            .where(
                and(
                    eq(familyMember.id, assignee),
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

    const [created] = await db
        .insert(chore)
        .values({
            id: createId(),
            familyId: membership.familyId,
            label: label.trim(),
            day,
            assigneeId: assignee,
        })
        .returning(CHORE_COLUMNS);

    return Response.json({ chore: created }, { status: 201 });
}
