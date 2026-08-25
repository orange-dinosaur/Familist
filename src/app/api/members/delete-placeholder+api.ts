/**
 * Deleting a placeholder. A placeholder has never had an account and cannot
 * sign in, so this takes nobody's access away - it removes a name from the
 * family and nothing else.
 *
 * Kept apart from removing an account member on purpose. The two look like the
 * same button and are not the same act, and `familist-adaptation.md` asks for
 * them to be impossible to confuse.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { resolveTargetMember } from '@/auth/session';
import { db } from '@/db';
import { familyMember } from '@/db/schema';

export async function POST(request: Request): Promise<Response> {
    const resolved = await resolveTargetMember(request);
    if ('error' in resolved) return resolved.error;

    const { membership, target } = resolved;

    if (target.userId) {
        return Response.json(
            { error: 'That member has an account' },
            { status: 409 }
        );
    }

    /**
     * `user_id is null` is repeated in the `WHERE` rather than trusted from
     * the read above: days need not pass for it to change, only the moment
     * between the two statements, and someone accepting an invitation that
     * targets this placeholder would make it an account member in between.
     */
    const deleted = await db
        .update(familyMember)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(familyMember.id, target.id),
                eq(familyMember.familyId, membership.familyId),
                isNull(familyMember.userId),
                isNull(familyMember.deletedAt)
            )
        )
        .returning({ id: familyMember.id });

    if (deleted.length === 0) {
        return Response.json(
            { error: 'That member can no longer be deleted' },
            { status: 409 }
        );
    }

    return Response.json({ member: { id: deleted[0].id } });
}
