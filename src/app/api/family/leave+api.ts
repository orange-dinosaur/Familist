/**
 * Leaving a family, and deleting one that nobody else can own.
 *
 * `POST` is the leave: self-removal, and it takes the same shape as
 * `members/remove-member` because it is the same act performed on yourself -
 * the row is soft-deleted and `user_id` cleared, freeing the slot the unique
 * index holds so the person could be invited back later.
 *
 * `DELETE` is the way out of the one family that cannot be left: the caller
 * owns it and there is nobody to hand it to.
 */

import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';

import {
    getMembership,
    setActiveMembership,
    switchedAway,
    unauthorized,
} from '@/auth/session';
import { db } from '@/db';
import { isLastOwner } from '@/db/members';
import { family, familyMember } from '@/db/schema';

/** The oldest membership left, which is where the pointer lands afterwards. */
async function remaining(userId: string, exceptFamilyId: string) {
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
                eq(familyMember.userId, userId),
                ne(familyMember.familyId, exceptFamilyId),
                isNull(familyMember.deletedAt)
            )
        )
        .orderBy(asc(familyMember.createdAt), asc(familyMember.id))
        .limit(1);

    return row ?? null;
}

/**
 * Where the caller ends up. Null for both fields is the onboarding signal the
 * guard already understands: they are signed in and belong nowhere.
 */
async function landing(userId: string, leftFamilyId: string) {
    const next = await remaining(userId, leftFamilyId);
    if (!next || !next.role) {
        return { family: null, member: null };
    }

    await setActiveMembership(userId, next.memberId);

    return {
        family: { id: next.familyId, name: next.familyName },
        member: { id: next.memberId, role: next.role },
    };
}

/** The family the caller believes they are in, to be agreed rather than used. */
function intended(request: Request): string | null {
    return new URL(request.url).searchParams.get('familyId');
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const mismatch = switchedAway(intended(request), membership);
    if (mismatch) return mismatch;

    const left = await db.transaction(async (tx) => {
        /** The same family-wide lock as `set-role`, for the same invariant. */
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${membership.familyId}))`
        );

        if (await isLastOwner(tx, membership.familyId, membership.memberId)) {
            return null;
        }

        return tx
            .update(familyMember)
            .set({ userId: null, role: null, deletedAt: new Date() })
            .where(
                and(
                    eq(familyMember.id, membership.memberId),
                    eq(familyMember.familyId, membership.familyId),
                    isNull(familyMember.deletedAt)
                )
            )
            .returning({ id: familyMember.id });
    });

    if (!left) {
        return Response.json(
            { error: 'Make someone else an owner before you leave' },
            { status: 409 }
        );
    }

    if (left.length === 0) {
        return Response.json(
            { error: 'You are no longer in that family' },
            { status: 409 }
        );
    }

    return Response.json(await landing(membership.userId, membership.familyId));
}

/**
 * Deleting the family, which is only offered where leaving cannot be: the
 * caller owns it and no one else has an account in it, so there is nobody to
 * promote and nobody else to lose anything.
 *
 * Placeholder members do not count. They cannot hold a role, so they are not
 * somebody to hand the family to, and nobody signs in as one.
 *
 * The row goes for real rather than being soft-deleted: every table that
 * belongs to a family cascades from it, so this is the one delete in the
 * project that is meant to take everything with it.
 */
export async function DELETE(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const mismatch = switchedAway(intended(request), membership);
    if (mismatch) return mismatch;

    if (membership.role !== 'owner') {
        return Response.json(
            { error: 'Only an owner can delete the family' },
            { status: 403 }
        );
    }

    const deleted = await db.transaction(async (tx) => {
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${membership.familyId}))`
        );

        const [other] = await tx
            .select({ id: familyMember.id })
            .from(familyMember)
            .where(
                and(
                    eq(familyMember.familyId, membership.familyId),
                    ne(familyMember.id, membership.memberId),
                    isNull(familyMember.deletedAt),
                    sql`${familyMember.userId} is not null`
                )
            )
            .limit(1);

        if (other) return false;

        await tx.delete(family).where(eq(family.id, membership.familyId));
        return true;
    });

    if (!deleted) {
        return Response.json(
            { error: 'Somebody else is still in this family' },
            { status: 409 }
        );
    }

    return Response.json(await landing(membership.userId, membership.familyId));
}
