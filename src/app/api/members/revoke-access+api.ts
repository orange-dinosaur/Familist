/**
 * Revoking an account member's access. The row stays, stripped back to what a
 * placeholder is: the family keeps the name, the colour and every assignment
 * ever made, and the person can no longer reach any of it.
 *
 * The exact inverse of the promotion in `invitations/accept`, and re-invitable
 * through it afterwards.
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

    /**
     * Leaving a family is the member's own decision, not something an owner
     * does to themselves by accident, and it has to answer the last-owner
     * question in `roles.md` - step 20. Until then, refusing it here also
     * means an owner always survives every revocation.
     */
    if (target.id === membership.memberId) {
        return Response.json(
            { error: 'You cannot revoke your own access' },
            { status: 403 }
        );
    }

    const revoked = await db
        .update(familyMember)
        .set({ userId: null, role: null })
        .where(
            and(
                eq(familyMember.id, target.id),
                eq(familyMember.familyId, membership.familyId),
                isNotNull(familyMember.userId),
                isNull(familyMember.deletedAt)
            )
        )
        .returning({ id: familyMember.id });

    if (revoked.length === 0) {
        return Response.json(
            { error: 'That member can no longer be revoked' },
            { status: 409 }
        );
    }

    return Response.json({ member: { id: revoked[0].id } });
}
