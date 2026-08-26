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

import { and, asc, eq, isNull } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { activeMembership, familyMember } from '@/db/schema';
import { type MemberRole } from '@/utils/member';

export type { MemberRole };

type FamilyMember = typeof familyMember.$inferSelect;

export interface Membership {
    userId: string;
    memberId: string;
    familyId: string;
    role: MemberRole;
}

/**
 * Whether the client is acting on the family it thinks it is.
 *
 * The routes that change or destroy a family resolve it from the session
 * rather than from the request, so that an id in a body can never name
 * somebody else's family. That leaves one gap: `active_membership` is server
 * state shared by every device signed in as this person, so switching family
 * on one leaves the others showing a family the server has moved on from. A
 * sheet still naming the old family would then rename - or delete - the new
 * one.
 *
 * So the client sends the id it means and this refuses when they differ. The
 * id is a statement of intent that has to agree, never the thing that selects
 * the row, which is why it is compared and then discarded.
 */
export function switchedAway(
    intended: unknown,
    membership: Membership
): Response | null {
    if (typeof intended !== 'string' || intended !== membership.familyId) {
        return Response.json(
            { error: 'You have since switched family. Try again.' },
            { status: 409 }
        );
    }
    return null;
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
 *
 * A person may belong to several families, so which one they are acting in is
 * read from `active_membership` rather than guessed. The join fetches the
 * pointer alongside the memberships, so this is still one round trip.
 *
 * The fallback is the oldest live membership, and it covers three cases that
 * are not errors: a person who has never switched, one whose pointer names a
 * membership that has since been revoked, and one whose pointer was written
 * before they were removed from that family. Ordering by `created_at` and then
 * `id` makes the answer the same every time, which the previous `limit(1)` on
 * an unordered query would not have been once there was more than one row.
 */
export async function getMembership(
    request: Request
): Promise<Membership | null> {
    const user = await getSessionUser(request);
    if (!user) return null;

    const rows = await db
        .select({
            member: familyMember,
            activeId: activeMembership.familyMemberId,
        })
        .from(familyMember)
        .leftJoin(
            activeMembership,
            eq(activeMembership.userId, familyMember.userId)
        )
        .where(
            and(
                eq(familyMember.userId, user.id),
                isNull(familyMember.deletedAt)
            )
        )
        .orderBy(asc(familyMember.createdAt), asc(familyMember.id));

    const live = rows.filter((row) => row.member.role !== null);
    if (live.length === 0) return null;

    const activeId = live[0].activeId;
    const chosen =
        live.find((row) => row.member.id === activeId)?.member ??
        live[0].member;

    if (!chosen.role) return null;

    return {
        userId: user.id,
        memberId: chosen.id,
        familyId: chosen.familyId,
        role: chosen.role,
    };
}

/**
 * Point the caller at one of their memberships. The membership is looked up by
 * the caller's own id, so there is nothing here that could name someone
 * else's.
 *
 * Takes the executor so that joining or creating a family can point at the
 * membership inside the same transaction that made it - a family created
 * without a pointer would still resolve, by the fallback, but pointing at the
 * one you just made is the answer rather than a coincidence of ordering.
 */
export async function setActiveMembership(
    userId: string,
    familyMemberId: string,
    executor: Pick<typeof db, 'insert'> = db
): Promise<void> {
    await executor
        .insert(activeMembership)
        .values({ userId, familyMemberId })
        .onConflictDoUpdate({
            target: activeMembership.userId,
            set: { familyMemberId, updatedAt: new Date() },
        });
}

/**
 * The member an owner is acting on, resolved the same way for every route that
 * manages members: the caller must be an owner, and the target is looked up by
 * id *and* the caller's `familyId`, never by the submitted id alone.
 *
 * Only the preamble is shared. What each route then does to the row - and what
 * it costs the person on the other end - is deliberately not.
 *
 * The parsed body comes back with it: a request body can only be read once, so
 * a route needing more than `memberId` has to be handed what was already read.
 */
export async function resolveTargetMember(request: Request): Promise<
    | { error: Response }
    | {
          membership: Membership;
          target: FamilyMember;
          body: Record<string, unknown>;
      }
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

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return {
            error: Response.json({ error: 'Invalid body' }, { status: 400 }),
        };
    }

    const { memberId } = body;

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

    return { membership, target, body };
}

export function unauthorized(): Response {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
