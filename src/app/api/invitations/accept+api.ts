/**
 * Accepting an invitation, in the two shapes the invite can take:
 *
 *   familyMemberId null  - join as a new member
 *   familyMemberId set   - become an existing placeholder, keeping every
 *                          assignment already made against it
 *
 * The caller needs a session but not a membership; this is how they get one.
 * They may already have others: what is refused is a second membership in the
 * family this code belongs to, not a second family.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';

import {
    getSessionUser,
    setActiveMembership,
    unauthorized,
} from '@/auth/session';
import { db } from '@/db';
import { family, familyMember, invitation } from '@/db/schema';
import { createId } from '@/utils/id';
import { initialsOf, MEMBER_COLORS, type MemberRole } from '@/utils/member';

type Failure = { status: number; error: string };
type Joined = {
    familyId: string;
    familyName: string;
    memberId: string;
    role: MemberRole;
};

export async function POST(request: Request): Promise<Response> {
    const user = await getSessionUser(request);
    if (!user) return unauthorized();

    let code: unknown;
    try {
        ({ code } = await request.json());
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (typeof code !== 'string' || !code.trim()) {
        return Response.json({ error: 'A code is required' }, { status: 400 });
    }

    const normalised = code.trim().toUpperCase();

    const result = await db.transaction<Failure | Joined>(async (tx) => {
        /**
         * Serialised per user for the length of the transaction. This reads
         * state, decides, then writes, and two codes for the same family
         * accepted at once would otherwise both pass the check below and
         * collide on the unique index instead of being answered properly.
         */
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${user.id}))`
        );

        const [invite] = await tx
            .select()
            .from(invitation)
            .where(eq(invitation.code, normalised))
            .limit(1);

        if (!invite) {
            return { status: 404, error: 'That code is not valid' };
        }
        if (invite.acceptedAt) {
            return { status: 409, error: 'That code has already been used' };
        }
        if (invite.expiresAt.getTime() <= Date.now()) {
            return { status: 410, error: 'That code has expired' };
        }

        /**
         * Belonging elsewhere is fine - a person may be in several families.
         * Belonging *here* is not: `family_member` is unique on
         * `(family_id, user_id)`, and there would be nothing for a second
         * membership in the same family to mean.
         */
        const [existing] = await tx
            .select()
            .from(familyMember)
            .where(
                and(
                    eq(familyMember.userId, user.id),
                    eq(familyMember.familyId, invite.familyId),
                    isNull(familyMember.deletedAt)
                )
            )
            .limit(1);

        if (existing) {
            return { status: 409, error: 'You are already in that family' };
        }

        let memberId: string;

        if (invite.familyMemberId) {
            /**
             * Re-checked here rather than trusted from the invitation:
             * the placeholder may have been promoted or removed in the
             * days since the code was issued.
             */
            const updated = await tx
                .update(familyMember)
                .set({ userId: user.id, role: invite.role })
                .where(
                    and(
                        eq(familyMember.id, invite.familyMemberId),
                        eq(familyMember.familyId, invite.familyId),
                        isNull(familyMember.userId),
                        isNull(familyMember.deletedAt)
                    )
                )
                .returning({ id: familyMember.id });

            if (updated.length === 0) {
                return {
                    status: 409,
                    error: 'That member can no longer be claimed',
                };
            }
            memberId = updated[0].id;
        } else {
            const siblings = await tx
                .select({ id: familyMember.id })
                .from(familyMember)
                .where(eq(familyMember.familyId, invite.familyId));

            memberId = createId();
            await tx.insert(familyMember).values({
                id: memberId,
                familyId: invite.familyId,
                name: user.name,
                initials: initialsOf(user.name),
                color: MEMBER_COLORS[siblings.length % MEMBER_COLORS.length],
                userId: user.id,
                role: invite.role,
            });
        }

        await tx
            .update(invitation)
            .set({ acceptedAt: new Date() })
            .where(eq(invitation.id, invite.id));

        /** You are in the family you just joined, not the one you were in. */
        await setActiveMembership(user.id, memberId, tx);

        const [row] = await tx
            .select({ name: family.name })
            .from(family)
            .where(eq(family.id, invite.familyId))
            .limit(1);

        return {
            familyId: invite.familyId,
            familyName: row.name,
            memberId,
            role: invite.role,
        };
    });

    if ('error' in result) {
        return Response.json(
            { error: result.error },
            { status: result.status }
        );
    }

    return Response.json({
        family: { id: result.familyId, name: result.familyName },
        member: { id: result.memberId, role: result.role },
    });
}
