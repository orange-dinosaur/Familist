/**
 * One of the family's saved chores. `PATCH` renames it, `DELETE` soft-deletes
 * it along with every day it was planned on.
 *
 * A chore belongs to whoever added it: they may rename or delete it, and so
 * may the family owner. Everyone else is refused, including an editor looking
 * at someone else's chore. Like the checker rule in `chores/[id]`, the row
 * condition goes into the `WHERE` rather than being read first and written
 * second, which would race.
 *
 * A member who added chores and was later made a checker keeps none of this:
 * a checker writes nothing but `done`.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    badRequest,
    CHORE_DEFINITION_COLUMNS,
    forbidden,
    nameError,
    notFound,
} from '@/db/content';
import { chore, choreDefinition } from '@/db/schema';

/**
 * The rows this member may act on: their own, unless they are the owner, for
 * whom every one of the family's chores is theirs to manage. A backfilled
 * chore has no creator, so it is the owner's alone.
 */
function ownRows(memberId: string, isOwner: boolean) {
    return isOwner ? [] : [eq(choreDefinition.createdBy, memberId)];
}

function refusal(isOwner: boolean): Response {
    return notFound(
        isOwner
            ? 'That chore is no longer there'
            : 'That chore is not yours to change'
    );
}

export async function PATCH(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick chores off');
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const submitted = Object.keys(body);
    if (submitted.length === 0) return badRequest('Nothing to change');
    if (submitted.some((field) => field !== 'name')) {
        return badRequest('Only the name can change');
    }

    const invalid = nameError(body.name);
    if (invalid) return badRequest(invalid);

    const isOwner = membership.role === 'owner';

    const updated = await db
        .update(choreDefinition)
        .set({ name: (body.name as string).trim() })
        .where(
            and(
                eq(choreDefinition.id, id),
                eq(choreDefinition.familyId, membership.familyId),
                isNull(choreDefinition.deletedAt),
                ...ownRows(membership.memberId, isOwner)
            )
        )
        .returning(CHORE_DEFINITION_COLUMNS);

    if (updated.length === 0) return refusal(isOwner);

    return Response.json({ choreDefinition: updated[0] });
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

    const isOwner = membership.role === 'owner';
    const deletedAt = new Date();

    /**
     * The days the chore was planned on go with it, in the same transaction:
     * a day entry whose chore is gone has nothing left to show, and leaving
     * one behind would put a nameless row on someone's calendar.
     */
    const deleted = await db.transaction(async (tx) => {
        const [definition] = await tx
            .update(choreDefinition)
            .set({ deletedAt })
            .where(
                and(
                    eq(choreDefinition.id, id),
                    eq(choreDefinition.familyId, membership.familyId),
                    isNull(choreDefinition.deletedAt),
                    ...ownRows(membership.memberId, isOwner)
                )
            )
            .returning({ id: choreDefinition.id });

        if (!definition) return null;

        await tx
            .update(chore)
            .set({ deletedAt })
            .where(
                and(
                    eq(chore.definitionId, definition.id),
                    eq(chore.familyId, membership.familyId),
                    isNull(chore.deletedAt)
                )
            );

        return definition;
    });

    if (!deleted) return refusal(isOwner);

    return Response.json({ choreDefinition: { id: deleted.id } });
}
