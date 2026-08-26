/**
 * The family's members, both kinds in one list. Reads are unrestricted inside
 * a family, per `.notes/data_management/roles.md`: any member sees everyone,
 * and only writes are gated by role.
 *
 * `role` doubles as the answer to "does this person have an account". The
 * `family_member_account_has_role` CHECK keeps `user_id` and `role` null or
 * set together, so a null role means a placeholder, and `user_id` itself never
 * has to leave the server.
 */

import { and, asc, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type MemberColor } from '@/constants/theme';
import { db } from '@/db';
import { familyMember, user } from '@/db/schema';
import { createId } from '@/utils/id';
import {
    initialsOf,
    MAX_MEMBER_NAME_LENGTH,
    MEMBER_COLORS,
} from '@/utils/member';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    /**
     * The picture belongs to the person, not to the membership, so it comes
     * from `user` - which is also why a placeholder never has one. The join is
     * left: a placeholder has no user row to match.
     */
    const members = await db
        .select({
            id: familyMember.id,
            name: familyMember.name,
            initials: familyMember.initials,
            color: familyMember.color,
            role: familyMember.role,
            image: user.image,
        })
        .from(familyMember)
        .leftJoin(user, eq(user.id, familyMember.userId))
        .where(
            and(
                eq(familyMember.familyId, membership.familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .orderBy(asc(familyMember.createdAt), asc(familyMember.id));

    return Response.json({ members });
}

/**
 * Creating a placeholder: a member of the family who has no account and cannot
 * sign in, but can be assigned anything. Owners only, like the rest of member
 * management - `roles.md` gives the member screen to owners, and an editor's
 * remit is the family's content rather than who is in it.
 *
 * `initials` is derived here rather than accepted, so a placeholder and an
 * account member end up with initials from the same rule.
 */
export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role !== 'owner') {
        return Response.json(
            { error: 'Only an owner can manage members' },
            { status: 403 }
        );
    }

    let body: { name?: unknown; color?: unknown };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { name, color } = body;

    if (typeof name !== 'string' || !name.trim()) {
        return Response.json({ error: 'A name is required' }, { status: 400 });
    }
    if (name.trim().length > MAX_MEMBER_NAME_LENGTH) {
        return Response.json(
            { error: 'That name is too long' },
            { status: 400 }
        );
    }
    if (
        color !== undefined &&
        (typeof color !== 'string' ||
            !MEMBER_COLORS.includes(color as MemberColor))
    ) {
        return Response.json({ error: 'Unknown colour' }, { status: 400 });
    }

    /** Omitting the colour cycles, exactly as joining a family does. */
    let chosen = color as MemberColor | undefined;
    if (!chosen) {
        const siblings = await db
            .select({ id: familyMember.id })
            .from(familyMember)
            .where(eq(familyMember.familyId, membership.familyId));
        chosen = MEMBER_COLORS[siblings.length % MEMBER_COLORS.length];
    }

    const [created] = await db
        .insert(familyMember)
        .values({
            id: createId(),
            familyId: membership.familyId,
            name: name.trim(),
            initials: initialsOf(name),
            color: chosen,
        })
        .returning({
            id: familyMember.id,
            name: familyMember.name,
            initials: familyMember.initials,
            color: familyMember.color,
            role: familyMember.role,
        });

    return Response.json({ member: created }, { status: 201 });
}
