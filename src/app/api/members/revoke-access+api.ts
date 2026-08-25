/**
 * Revoking an account member's access. The row stays, stripped back to what a
 * placeholder is: the family keeps the name, the colour and every assignment
 * ever made, and the person can no longer reach any of it.
 *
 * The exact inverse of the promotion in `invitations/accept`, and re-invitable
 * through it afterwards.
 */

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { resolveTargetMember } from '@/auth/session';
import { db } from '@/db';
import { isLastOwner } from '@/db/members';
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
     * Leaving a family is the member's own decision, with its own screen and
     * its own confirmation, rather than something an owner does to themselves
     * through the member list.
     */
    if (target.id === membership.memberId) {
        return Response.json(
            { error: 'You cannot revoke your own access' },
            { status: 403 }
        );
    }

    const result = await db.transaction(async (tx) => {
        /** The same family-wide lock as `set-role`, for the same invariant. */
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${membership.familyId}))`
        );

        if (await isLastOwner(tx, membership.familyId, target.id)) {
            return null;
        }

        return tx
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
            .returning({
                id: familyMember.id,
                name: familyMember.name,
                initials: familyMember.initials,
                color: familyMember.color,
                role: familyMember.role,
            });
    });

    if (!result) {
        return Response.json(
            { error: 'A family must always have an owner' },
            { status: 409 }
        );
    }

    if (result.length === 0) {
        return Response.json(
            { error: 'That member can no longer be revoked' },
            { status: 409 }
        );
    }

    return Response.json({ member: result[0] });
}
