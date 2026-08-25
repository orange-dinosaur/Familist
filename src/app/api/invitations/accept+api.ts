/**
 * Accepting an invitation, in the two shapes the invite can take:
 *
 *   familyMemberId null  - join as a new member
 *   familyMemberId set   - become an existing placeholder, keeping every
 *                          assignment already made against it
 *
 * The caller needs a session but not a membership; this is how they get one.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';

import { getSessionUser, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { familyMember, invitation } from '@/db/schema';
import { createId } from '@/utils/id';
import { initialsOf, MEMBER_COLORS } from '@/utils/member';

type Failure = { status: number; error: string };

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

    const result = await db.transaction<
        Failure | { familyId: string; memberId: string }
    >(async (tx) => {
        /**
         * Same lock as creating a family, for the same reason: this reads
         * state, decides, then writes, and two taps would otherwise both
         * pass the "do you already belong somewhere" check.
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

        const [existing] = await tx
            .select()
            .from(familyMember)
            .where(
                and(
                    eq(familyMember.userId, user.id),
                    isNull(familyMember.deletedAt)
                )
            )
            .limit(1);

        if (existing) {
            return { status: 409, error: 'You already belong to a family' };
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

        return { familyId: invite.familyId, memberId };
    });

    if ('error' in result) {
        return Response.json(
            { error: result.error },
            { status: result.status }
        );
    }

    return Response.json({
        family: { id: result.familyId },
        member: { id: result.memberId },
    });
}
