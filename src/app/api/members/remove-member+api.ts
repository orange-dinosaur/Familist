/**
 * Removing an account member from the family: their access goes and so does
 * the row, which is the difference between this and revoking access.
 *
 * `user_id` is cleared as well as `deleted_at` set. The soft-deleted row would
 * otherwise keep holding that pair in the `(family_id, user_id)` unique index,
 * and inviting the same person back into the same family inserts a new member -
 * which would collide with a row nobody can see.
 */

import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { resolveTargetMember } from '@/auth/session';
import { db } from '@/db';
import { familyMember } from '@/db/schema';

export async function POST(request: Request): Promise<Response> {
    const resolved = await resolveTargetMember(request);
    if ('error' in resolved) return resolved.error;

    const { membership, target } = resolved;

    if (!target.userId) {
        return Response.json(
            { error: 'That member does not have an account' },
            { status: 409 }
        );
    }

    if (target.id === membership.memberId) {
        return Response.json(
            { error: 'You cannot remove yourself from the family' },
            { status: 403 }
        );
    }

    const removed = await db
        .update(familyMember)
        .set({ userId: null, role: null, deletedAt: new Date() })
        .where(
            and(
                eq(familyMember.id, target.id),
                eq(familyMember.familyId, membership.familyId),
                isNotNull(familyMember.userId),
                isNull(familyMember.deletedAt)
            )
        )
        .returning({ id: familyMember.id });

    if (removed.length === 0) {
        return Response.json(
            { error: 'That member can no longer be removed' },
            { status: 409 }
        );
    }

    return Response.json({ member: { id: removed[0].id } });
}
