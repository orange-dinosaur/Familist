/**
 * Creating invitations. Owners only, per `.notes/data_management/roles.md`.
 *
 * An invitation either adds a new member or targets an existing placeholder,
 * which is what lets someone who has been assigned chores for months keep that
 * history when they finally get a login.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { familyMember, invitation } from '@/db/schema';
import { createId, createInviteCode } from '@/utils/id';
import { MEMBER_ROLES, type MemberRole } from '@/utils/member';

const EXPIRY_DAYS = 7;

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role !== 'owner') {
        return Response.json(
            { error: 'Only an owner can invite people' },
            { status: 403 }
        );
    }

    let body: { role?: unknown; familyMemberId?: unknown; email?: unknown };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { role, familyMemberId, email } = body;

    if (
        typeof role !== 'string' ||
        !MEMBER_ROLES.includes(role as MemberRole)
    ) {
        return Response.json({ error: 'Unknown role' }, { status: 400 });
    }
    if (
        familyMemberId !== undefined &&
        familyMemberId !== null &&
        typeof familyMemberId !== 'string'
    ) {
        return Response.json({ error: 'Invalid target' }, { status: 400 });
    }
    if (email !== undefined && email !== null && typeof email !== 'string') {
        return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const targetId = typeof familyMemberId === 'string' ? familyMemberId : null;

    if (targetId) {
        /**
         * Scoped by the caller's family, never by the submitted id alone: an
         * unscoped lookup here would let an owner target a member of another
         * family, and there is no row-level security underneath to catch it.
         */
        const [target] = await db
            .select()
            .from(familyMember)
            .where(
                and(
                    eq(familyMember.id, targetId),
                    eq(familyMember.familyId, membership.familyId),
                    isNull(familyMember.deletedAt)
                )
            )
            .limit(1);

        if (!target) {
            return Response.json(
                { error: 'That member is not in your family' },
                { status: 404 }
            );
        }
        if (target.userId) {
            return Response.json(
                { error: 'That member already has an account' },
                { status: 409 }
            );
        }
    }

    const code = createInviteCode();
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000);

    await db.insert(invitation).values({
        id: createId(),
        familyId: membership.familyId,
        familyMemberId: targetId,
        role: role as MemberRole,
        code,
        email: typeof email === 'string' && email.trim() ? email.trim() : null,
        invitedBy: membership.userId,
        expiresAt,
    });

    return Response.json(
        { code, role, familyMemberId: targetId, expiresAt },
        { status: 201 }
    );
}
