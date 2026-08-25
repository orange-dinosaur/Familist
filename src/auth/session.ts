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

export type MemberRole = 'owner' | 'editor' | 'checker';

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

export function unauthorized(): Response {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
