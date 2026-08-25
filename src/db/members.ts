/**
 * Member queries that more than one route needs, written to run inside the
 * caller's transaction rather than on a connection of their own.
 */

import { and, eq, isNull, ne } from 'drizzle-orm';

import { db } from '@/db';
import { familyMember } from '@/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Whether this member is the last owner the family has, which is what makes
 * demoting or removing them the one change nobody can undo: with no owner left
 * there is no one who can grant the role back.
 *
 * Two reads rather than a count, because the answer is "does anybody else own
 * this family", and the current role has to be read inside the transaction -
 * the row may have been demoted since the handler looked at it.
 */
export async function isLastOwner(
    tx: Transaction,
    familyId: string,
    memberId: string
): Promise<boolean> {
    const [target] = await tx
        .select({ role: familyMember.role })
        .from(familyMember)
        .where(
            and(
                eq(familyMember.id, memberId),
                eq(familyMember.familyId, familyId),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    if (target?.role !== 'owner') return false;

    const [other] = await tx
        .select({ id: familyMember.id })
        .from(familyMember)
        .where(
            and(
                eq(familyMember.familyId, familyId),
                eq(familyMember.role, 'owner'),
                ne(familyMember.id, memberId),
                isNull(familyMember.deletedAt)
            )
        )
        .limit(1);

    return !other;
}
