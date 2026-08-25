/**
 * Resolving who is asking, server-side. Every API route that touches family
 * data starts here.
 *
 * The rules from `.notes/data_management/familist-adaptation.md` apply without
 * exception: re-fetch the session per request, never trust a client-supplied
 * id, and scope every read and write by the `familyId` resolved here rather
 * than by anything in the request body. There is no row-level security
 * underneath, so a single unscoped query is a cross-family leak.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { familyMember } from '@/db/schema';
import { type MemberRole } from '@/utils/member';

export type { MemberRole };

type FamilyMember = typeof familyMember.$inferSelect;

export interface Membership {
    userId: string;
    memberId: string;
    familyId: string;
    role: MemberRole;
}

export async function getSessionUser(
    request: Request
): Promise<{ id: string; name: string; email: string } | null> {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;

    const { id, name, email } = session.user;
    return { id, name, email };
}

/**
 * The caller's membership, or null when they are signed out or have no family
 * yet. A member whose row is soft-deleted has been removed from the family and
 * must not resolve.
 */
export async function getMembership(
    request: Request
): Promise<Membership | null> {
    const user = await getSessionUser(request);
    if (!user) return null;

    const [row] = await db
        .select()
        .from(familyMember)
        .where(
            and(
                eq(familyMember.userId, user.id),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    if (!row || !row.role) return null;

    return {
        userId: user.id,
        memberId: row.id,
        familyId: row.familyId,
        role: row.role,
    };
}

/**
 * The member an owner is acting on, resolved the same way for every route that
 * manages members: the caller must be an owner, and the target is looked up by
 * id *and* the caller's `familyId`, never by the submitted id alone.
 *
 * Only the preamble is shared. What each route then does to the row - and what
 * it costs the person on the other end - is deliberately not.
 */
export async function resolveTargetMember(
    request: Request
): Promise<
    { error: Response } | { membership: Membership; target: FamilyMember }
> {
    const membership = await getMembership(request);
    if (!membership) return { error: unauthorized() };

    if (membership.role !== 'owner') {
        return {
            error: Response.json(
                { error: 'Only an owner can manage members' },
                { status: 403 }
            ),
        };
    }

    let memberId: unknown;
    try {
        ({ memberId } = await request.json());
    } catch {
        return {
            error: Response.json({ error: 'Invalid body' }, { status: 400 }),
        };
    }

    if (typeof memberId !== 'string' || !memberId.trim()) {
        return {
            error: Response.json(
                { error: 'A member is required' },
                { status: 400 }
            ),
        };
    }

    const [target] = await db
        .select()
        .from(familyMember)
        .where(
            and(
                eq(familyMember.id, memberId),
                eq(familyMember.familyId, membership.familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    if (!target) {
        return {
            error: Response.json(
                { error: 'That member is not in your family' },
                { status: 404 }
            ),
        };
    }

    return { membership, target };
}

export function unauthorized(): Response {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
