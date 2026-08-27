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

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    CHORE_COLUMNS,
    choreDefinitionName,
    dayError,
    forbidden,
    idError,
    labelError,
    notFound,
    readSince,
    retriedCreate,
} from '@/db/content';
import { chore } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const chores = await db
        .select(CHORE_COLUMNS)
        .from(chore)
        .where(
            and(
                eq(chore.familyId, membership.familyId),
                since ? gte(chore.updatedAt, since) : isNull(chore.deletedAt)
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

    let body: {
        id?: unknown;
        label?: unknown;
        definitionId?: unknown;
        day?: unknown;
        assigneeId?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, label, definitionId, day, assigneeId } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    if (definitionId !== undefined && typeof definitionId !== 'string') {
        return badRequest('Invalid chore');
    }

    const definition = typeof definitionId === 'string' ? definitionId : null;

    /**
     * An entry planned from one of the family's chores is called whatever that
     * chore is called, so the label is read from it rather than taken from the
     * body. A body that carries a label instead is the older shape, kept until
     * the column goes.
     */
    const name = definition
        ? await choreDefinitionName(membership.familyId, definition)
        : null;

    if (definition && name === null) {
        return notFound('That chore is not in your family');
    }

    const invalid = (name === null ? labelError(label) : null) ?? dayError(day);
    if (invalid) return badRequest(invalid);

    if (
        assigneeId !== undefined &&
        assigneeId !== null &&
        typeof assigneeId !== 'string'
    ) {
        return badRequest('Invalid assignee');
    }

    const assignee = typeof assigneeId === 'string' ? assigneeId : null;

    if (assignee && !(await assigneeInFamily(membership.familyId, assignee))) {
        return notFound('That member is not in your family');
    }

    const [created] = await db
        .insert(chore)
        .values({
            id: recordId,
            familyId: membership.familyId,
            label: name ?? (label as string).trim(),
            definitionId: definition,
            day: day as string,
            assigneeId: assignee,
        })
        .onConflictDoNothing()
        .returning(CHORE_COLUMNS);

    if (created) return Response.json({ chore: created }, { status: 201 });

    return retriedCreate(
        chore,
        CHORE_COLUMNS,
        'chore',
        recordId,
        membership.familyId
    );
}
