/**
 * Which family the caller is acting in.
 *
 * The pointer is the server's, not the client's: this route takes a family id,
 * checks the caller has a live membership in it, and stores the membership -
 * so every other route goes on resolving the family from the session and none
 * of them had to change.
 *
 * Switching is therefore an account-wide fact rather than a per-device one. A
 * switch on a phone is a switch on the laptop as well, which for a family app
 * is the behaviour to want rather than to apologise for.
 */

import { and, eq, isNull } from 'drizzle-orm';

import {
    getSessionUser,
    setActiveMembership,
    unauthorized,
} from '@/auth/session';
import { db } from '@/db';
import { family, familyMember } from '@/db/schema';

export async function POST(request: Request): Promise<Response> {
    const user = await getSessionUser(request);
    if (!user) return unauthorized();

    let familyId: unknown;
    try {
        ({ familyId } = await request.json());
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (typeof familyId !== 'string' || !familyId.trim()) {
        return Response.json(
            { error: 'A family is required' },
            { status: 400 }
        );
    }

    /**
     * Joined rather than looked up separately: the membership is what proves
     * the caller may go there, and the family's name is what the client needs
     * back, and one row carries both.
     */
    const [row] = await db
        .select({
            memberId: familyMember.id,
            role: familyMember.role,
            familyId: family.id,
            familyName: family.name,
        })
        .from(familyMember)
        .innerJoin(family, eq(family.id, familyMember.familyId))
        .where(
            and(
                eq(familyMember.userId, user.id),
                eq(familyMember.familyId, familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    if (!row || !row.role) {
        return Response.json(
            { error: 'You are not in that family' },
            { status: 404 }
        );
    }

    await setActiveMembership(user.id, row.memberId);

    return Response.json({
        family: { id: row.familyId, name: row.familyName },
        member: { id: row.memberId, role: row.role },
    });
}
