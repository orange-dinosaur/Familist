/**
 * The chores a family has saved. The day entries in `/api/chores` are planned
 * from these, and this is the collection the Add Chores modal reads.
 *
 * The four rules from `.notes/data_management/familist-adaptation.md` apply
 * here as everywhere: the session is re-fetched per request, reads are
 * filtered by the caller's `family_id`, writes stamp it from the session
 * rather than the body, and updates and deletes match on record id **and**
 * `family_id`.
 *
 * Reads are unrestricted inside a family. Adding a chore is for owners and
 * editors; renaming and deleting one is for whoever added it or for the owner,
 * which is enforced in `chore-definitions/[id]`.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    badRequest,
    CHORE_DEFINITION_COLUMNS,
    forbidden,
    idError,
    nameError,
    readSince,
    retriedCreate,
} from '@/db/content';
import { choreDefinition } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const choreDefinitions = await db
        .select(CHORE_DEFINITION_COLUMNS)
        .from(choreDefinition)
        .where(
            and(
                eq(choreDefinition.familyId, membership.familyId),
                since
                    ? gte(choreDefinition.updatedAt, since)
                    : isNull(choreDefinition.deletedAt)
            )
        )
        .orderBy(asc(choreDefinition.createdAt), asc(choreDefinition.id));

    return Response.json({ choreDefinitions });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick off what is assigned to you');
    }

    let body: { id?: unknown; name?: unknown };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, name } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    const invalid = nameError(name);
    if (invalid) return badRequest(invalid);

    /**
     * Who added it, from the session rather than the body: it is what decides
     * later whether this member may rename or delete it.
     */
    const [created] = await db
        .insert(choreDefinition)
        .values({
            id: recordId,
            familyId: membership.familyId,
            name: (name as string).trim(),
            createdBy: membership.memberId,
        })
        .onConflictDoNothing()
        .returning(CHORE_DEFINITION_COLUMNS);

    if (created) {
        return Response.json({ choreDefinition: created }, { status: 201 });
    }

    return retriedCreate(
        choreDefinition,
        CHORE_DEFINITION_COLUMNS,
        'choreDefinition',
        recordId,
        membership.familyId
    );
}
