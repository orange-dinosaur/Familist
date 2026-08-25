/**
 * Granting and revoking roles. Owners only, per
 * `.notes/data_management/roles.md`.
 *
 * An owner may demote themselves - that is a decision, not an accident, and it
 * is safe as long as somebody else owns the family. The last owner may not be
 * demoted by anyone, themselves included: with no owner left, nobody can ever
 * grant the role back and the family is stuck.
 */

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { resolveTargetMember } from '@/auth/session';
import { db } from '@/db';
import { isLastOwner } from '@/db/members';
import { familyMember } from '@/db/schema';
import { MEMBER_ROLES, type MemberRole } from '@/utils/member';

export async function POST(request: Request): Promise<Response> {
    const resolved = await resolveTargetMember(request);
    if ('error' in resolved) return resolved.error;

    const { membership, target, body } = resolved;
    const { role } = body;

    if (
        typeof role !== 'string' ||
        !MEMBER_ROLES.includes(role as MemberRole)
    ) {
        return Response.json({ error: 'Unknown role' }, { status: 400 });
    }

    if (!target.userId) {
        return Response.json(
            { error: 'That member does not have an account' },
            { status: 409 }
        );
    }

    const result = await db.transaction(async (tx) => {
        /**
         * Family-wide, not per user: the invariant counts owners across the
         * whole family, so two owners demoting each other at the same moment
         * must not both be told they are fine. Every route that can take an
         * owner away holds this same lock.
         */
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${membership.familyId}))`
        );

        if (
            role !== 'owner' &&
            (await isLastOwner(tx, membership.familyId, target.id))
        ) {
            return null;
        }

        return tx
            .update(familyMember)
            .set({ role: role as MemberRole })
            .where(
                and(
                    eq(familyMember.id, target.id),
                    eq(familyMember.familyId, membership.familyId),
                    isNotNull(familyMember.userId),
                    isNull(familyMember.deletedAt)
                )
            )
            .returning({ id: familyMember.id, role: familyMember.role });
    });

    if (!result) {
        return Response.json(
            { error: 'A family must always have an owner' },
            { status: 409 }
        );
    }

    if (result.length === 0) {
        return Response.json(
            { error: 'That role can no longer be changed' },
            { status: 409 }
        );
    }

    return Response.json({ member: result[0] });
}
