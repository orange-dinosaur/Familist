/**
 * Handing a family over, from outside it.
 *
 * Deleting an account refuses while the caller is the last owner of a family
 * other people are still in, and the only cure is to make somebody else an
 * owner. Every other member route acts on the family the session says the
 * caller is in, which would mean switching into each family in turn just to
 * promote one person and switching back - so these take the family by id.
 *
 * That is safe for the same reason `family/switch` is: the id selects among
 * the caller's *own* memberships and proves nothing by itself. The caller's
 * membership in the named family is what is read, and it has to be an owner's.
 */

import { and, asc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';

import { getSessionUser, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { familyMember } from '@/db/schema';

/** The caller's own membership in the named family, if they own it. */
async function ownership(userId: string, familyId: unknown) {
    if (typeof familyId !== 'string' || !familyId.trim()) return null;

    const [mine] = await db
        .select({ id: familyMember.id, role: familyMember.role })
        .from(familyMember)
        .where(
            and(
                eq(familyMember.userId, userId),
                eq(familyMember.familyId, familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    if (mine?.role !== 'owner') return null;

    return { memberId: mine.id, familyId };
}

/** Who could take the family: everybody else in it with an account. */
export async function GET(request: Request): Promise<Response> {
    const user = await getSessionUser(request);
    if (!user) return unauthorized();

    const familyId = new URL(request.url).searchParams.get('familyId');
    const owned = await ownership(user.id, familyId);

    if (!owned) {
        return Response.json(
            { error: 'You do not own that family' },
            { status: 403 }
        );
    }

    const candidates = await db
        .select({
            id: familyMember.id,
            name: familyMember.name,
            initials: familyMember.initials,
            color: familyMember.color,
            role: familyMember.role,
        })
        .from(familyMember)
        .where(
            and(
                eq(familyMember.familyId, owned.familyId),
                ne(familyMember.id, owned.memberId),
                isNotNull(familyMember.userId),
                isNull(familyMember.deletedAt)
            )
        )
        .orderBy(asc(familyMember.createdAt), asc(familyMember.id));

    return Response.json({ members: candidates });
}

/**
 * Making one of them an owner. Only ever upwards: this is the way out of a
 * deletion that is blocked, and taking a role away from here would be a
 * different act with different consequences.
 */
export async function POST(request: Request): Promise<Response> {
    const user = await getSessionUser(request);
    if (!user) return unauthorized();

    let familyId: unknown;
    let memberId: unknown;
    try {
        ({ familyId, memberId } = await request.json());
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const owned = await ownership(user.id, familyId);

    if (!owned) {
        return Response.json(
            { error: 'You do not own that family' },
            { status: 403 }
        );
    }

    if (typeof memberId !== 'string' || memberId === owned.memberId) {
        return Response.json(
            { error: 'Choose somebody else' },
            { status: 400 }
        );
    }

    const [promoted] = await db.transaction(async (tx) => {
        /** The same family-wide lock every route that moves a role takes. */
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${owned.familyId}))`
        );

        return tx
            .update(familyMember)
            .set({ role: 'owner' })
            .where(
                and(
                    eq(familyMember.id, memberId),
                    eq(familyMember.familyId, owned.familyId),
                    isNotNull(familyMember.userId),
                    isNull(familyMember.deletedAt)
                )
            )
            .returning({ id: familyMember.id, name: familyMember.name });
    });

    if (!promoted) {
        return Response.json(
            { error: 'That member is no longer in the family' },
            { status: 404 }
        );
    }

    return Response.json({ member: promoted });
}
