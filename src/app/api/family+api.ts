/**
 * The caller's family. `GET` answers "does this user have one yet", which is
 * what the signed-in app asks before deciding whether to onboard; `POST`
 * creates one with the caller as its first owner.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';

import { getMembership, getSessionUser, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { family, familyMember } from '@/db/schema';
import { createId } from '@/utils/id';
import { initialsOf, MEMBER_COLORS } from '@/utils/member';

const MAX_NAME_LENGTH = 60;

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) {
        const user = await getSessionUser(request);
        if (!user) return unauthorized();
        return Response.json({ family: null, member: null });
    }

    const [row] = await db
        .select()
        .from(family)
        .where(eq(family.id, membership.familyId))
        .limit(1);

    return Response.json({
        family: row ? { id: row.id, name: row.name } : null,
        member: {
            id: membership.memberId,
            role: membership.role,
        },
    });
}

export async function POST(request: Request): Promise<Response> {
    const user = await getSessionUser(request);
    if (!user) return unauthorized();

    let name: unknown;
    try {
        ({ name } = await request.json());
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (typeof name !== 'string' || !name.trim()) {
        return Response.json({ error: 'A name is required' }, { status: 400 });
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
        return Response.json(
            { error: 'That name is too long' },
            { status: 400 }
        );
    }

    const created = await db.transaction(async (tx) => {
        /**
         * Serialised per user for the length of the transaction. Re-reading
         * inside the transaction is not enough on its own: under READ
         * COMMITTED two concurrent creates both see no membership and both
         * insert, because nothing in the schema forbids one user holding two
         * memberships - by design, since a person may join a second family
         * later.
         */
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${user.id}))`
        );

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

        if (existing) return null;

        const familyId = createId();
        await tx.insert(family).values({ id: familyId, name: name.trim() });
        const memberId = createId();
        await tx.insert(familyMember).values({
            id: memberId,
            familyId,
            name: user.name,
            initials: initialsOf(user.name),
            color: MEMBER_COLORS[0],
            userId: user.id,
            role: 'owner',
        });

        return { familyId, memberId };
    });

    if (!created) {
        return Response.json(
            { error: 'You already belong to a family' },
            { status: 409 }
        );
    }

    return Response.json(
        {
            family: { id: created.familyId, name: name.trim() },
            member: { id: created.memberId, role: 'owner' },
        },
        { status: 201 }
    );
}
