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
import { db } from '@/db';
import { familyMember } from '@/db/schema';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const members = await db
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
                eq(familyMember.familyId, membership.familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .orderBy(asc(familyMember.createdAt), asc(familyMember.id));

    return Response.json({ members });
}
