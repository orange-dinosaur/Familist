/**
 * A member's name and colour. Unlike removal, this one route deliberately
 * serves both kinds: `family_member.name` is the family's label for a person,
 * not their account name - which is why promoting a placeholder in
 * `invitations/accept` keeps the name the family already uses - and the colour
 * is a family-scoped display choice either way.
 *
 * Anybody may change their own row. Anyone else's takes an owner.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { resolveTargetMember } from '@/auth/session';
import { type MemberColor } from '@/constants/theme';
import { db } from '@/db';
import { familyMember } from '@/db/schema';
import {
    initialsOf,
    MAX_MEMBER_NAME_LENGTH,
    MEMBER_COLORS,
} from '@/utils/member';

export async function POST(request: Request): Promise<Response> {
    const resolved = await resolveTargetMember(request, { allowSelf: true });
    if ('error' in resolved) return resolved.error;

    const { membership, target, body } = resolved;
    const { name, color } = body;

    if (name === undefined && color === undefined) {
        return Response.json({ error: 'Nothing to change' }, { status: 400 });
    }

    if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
            return Response.json(
                { error: 'A name is required' },
                { status: 400 }
            );
        }
        if (name.trim().length > MAX_MEMBER_NAME_LENGTH) {
            return Response.json(
                { error: 'That name is too long' },
                { status: 400 }
            );
        }
    }

    if (
        color !== undefined &&
        (typeof color !== 'string' ||
            !MEMBER_COLORS.includes(color as MemberColor))
    ) {
        return Response.json({ error: 'Unknown colour' }, { status: 400 });
    }

    /** Initials follow the name; they are never sent in and never kept stale. */
    const changes =
        typeof name === 'string'
            ? { name: name.trim(), initials: initialsOf(name) }
            : {};

    const updated = await db
        .update(familyMember)
        .set(
            color === undefined
                ? changes
                : { ...changes, color: color as MemberColor }
        )
        .where(
            and(
                eq(familyMember.id, target.id),
                eq(familyMember.familyId, membership.familyId),
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

    if (updated.length === 0) {
        return Response.json(
            { error: 'That member can no longer be changed' },
            { status: 409 }
        );
    }

    return Response.json({ member: updated[0] });
}
