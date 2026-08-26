/**
 * The caller's family - the one they are currently acting in, which since the
 * pointer landed need not be their only one. `GET` answers "does this user
 * have a family yet", which is what the signed-in app asks before deciding
 * whether to onboard; `POST` creates one with the caller as its first owner
 * and moves them into it; `PATCH` renames it.
 */

import { and, asc, eq, isNull } from 'drizzle-orm';

import {
    getMembership,
    getSessionUser,
    setActiveMembership,
    switchedAway,
    unauthorized,
} from '@/auth/session';
import { db } from '@/db';
import { family, familyMember } from '@/db/schema';
import { createId } from '@/utils/id';
import { initialsOf, MEMBER_COLORS } from '@/utils/member';

const MAX_NAME_LENGTH = 60;

function nameError(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return 'A name is required';
    if (value.trim().length > MAX_NAME_LENGTH) return 'That name is too long';
    return null;
}

/**
 * The active family and every family the caller belongs to, in one answer.
 * They are the same question at two zoom levels, and asking them separately
 * would be two round trips on every load that could disagree with each other.
 *
 * `family: null` is the onboarding signal and still means what it always did:
 * this person has no family yet.
 */
export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) {
        const user = await getSessionUser(request);
        if (!user) return unauthorized();
        return Response.json({ family: null, member: null, families: [] });
    }

    const families = await db
        .select({
            id: family.id,
            name: family.name,
            role: familyMember.role,
        })
        .from(familyMember)
        .innerJoin(family, eq(family.id, familyMember.familyId))
        .where(
            and(
                eq(familyMember.userId, membership.userId),
                isNull(familyMember.deletedAt)
            )
        )
        .orderBy(asc(familyMember.createdAt), asc(familyMember.id));

    const active = families.find((row) => row.id === membership.familyId);

    return Response.json({
        family: active ? { id: active.id, name: active.name } : null,
        member: {
            id: membership.memberId,
            role: membership.role,
        },
        families,
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

    const invalid = nameError(name);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    const familyName = (name as string).trim();

    /**
     * Unconditional now. This used to refuse anyone who already belonged
     * somewhere, under an advisory lock that existed only to make that check
     * safe against a double tap - with the rule gone, so is its reason. A
     * person may own several families, and the transaction is here so that a
     * family and its first member land together or not at all.
     */
    const created = await db.transaction(async (tx) => {
        const familyId = createId();
        await tx.insert(family).values({ id: familyId, name: familyName });

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

        /** You are in the family you just made, not the one you were in. */
        await setActiveMembership(user.id, memberId, tx);

        return { familyId, memberId };
    });

    return Response.json(
        {
            family: { id: created.familyId, name: familyName },
            member: { id: created.memberId, role: 'owner' },
        },
        { status: 201 }
    );
}

/**
 * Renaming the family. Owner only, the same rule the member routes apply to
 * everything that changes who or what the family is.
 *
 * The `WHERE` names the family the caller is actually in rather than taking an
 * id from the body, so there is no id here to belong to somebody else.
 */
export async function PATCH(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role !== 'owner') {
        return Response.json(
            { error: 'Only an owner can rename the family' },
            { status: 403 }
        );
    }

    let name: unknown;
    let familyId: unknown;
    try {
        ({ name, familyId } = await request.json());
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const mismatch = switchedAway(familyId, membership);
    if (mismatch) return mismatch;

    const invalid = nameError(name);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    const [row] = await db
        .update(family)
        .set({ name: (name as string).trim() })
        .where(eq(family.id, membership.familyId))
        .returning({ id: family.id, name: family.name });

    if (!row) {
        return Response.json(
            { error: 'That family is no longer there' },
            { status: 404 }
        );
    }

    return Response.json({ family: row });
}
