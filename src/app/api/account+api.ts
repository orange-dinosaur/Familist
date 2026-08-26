/**
 * Deleting the signed-in person's account.
 *
 * Every family they are in is settled first, by the rules leaving already
 * follows: a family whose only account is theirs goes with them, one where
 * somebody else has an account they simply leave. The one case neither covers
 * is a family they are the last owner of while other people are still in it -
 * there is nobody to hand it to, and taking it away or promoting somebody
 * unasked are both worse than saying so. Those are named back to the caller
 * and nothing is deleted.
 *
 * `user_id` is `ON DELETE RESTRICT` on `family_member`, so a membership left
 * pointing at this person would refuse the delete outright. Leaving already
 * clears it; the sweep afterwards is for rows that were soft-deleted by some
 * other path and still carry it.
 */

import { and, eq, isNull, ne, sql } from 'drizzle-orm';

import { getSessionUser, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { isLastOwner } from '@/db/members';
import { family, familyMember, user } from '@/db/schema';

/**
 * Thrown to undo everything the transaction has done so far, carrying the
 * families that stopped it. A sentinel rather than a message, so the catch
 * cannot mistake a database failure for a refusal.
 */
class HasOwnedFamilies extends Error {
    readonly families: string[];

    constructor(families: string[]) {
        super('Owned families remain');
        this.families = families;
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const account = await getSessionUser(request);
    if (!account) return unauthorized();

    try {
        await db.transaction(async (tx) => {
            const memberships = await tx
                .select({
                    memberId: familyMember.id,
                    familyId: familyMember.familyId,
                    familyName: family.name,
                })
                .from(familyMember)
                .innerJoin(family, eq(family.id, familyMember.familyId))
                .where(
                    and(
                        eq(familyMember.userId, account.id),
                        isNull(familyMember.deletedAt)
                    )
                );

            const stuck: string[] = [];

            for (const { memberId, familyId, familyName } of memberships) {
                /** The same family-wide lock leaving takes, for the same invariant. */
                await tx.execute(
                    sql`select pg_advisory_xact_lock(hashtext(${familyId}))`
                );

                const [other] = await tx
                    .select({ id: familyMember.id })
                    .from(familyMember)
                    .where(
                        and(
                            eq(familyMember.familyId, familyId),
                            ne(familyMember.id, memberId),
                            isNull(familyMember.deletedAt),
                            sql`${familyMember.userId} is not null`
                        )
                    )
                    .limit(1);

                if (await isLastOwner(tx, familyId, memberId)) {
                    /**
                     * Nobody else signs in here, so the family has no life without
                     * this person and everything in it cascades away with the row.
                     */
                    if (!other) {
                        await tx.delete(family).where(eq(family.id, familyId));
                        continue;
                    }

                    stuck.push(familyName);
                    continue;
                }

                await tx
                    .update(familyMember)
                    .set({ userId: null, role: null, deletedAt: new Date() })
                    .where(eq(familyMember.id, memberId));
            }

            /** Nothing has happened yet: the rollback is the whole of the refusal. */
            if (stuck.length > 0) throw new HasOwnedFamilies(stuck);

            await tx
                .update(familyMember)
                .set({ userId: null, role: null })
                .where(eq(familyMember.userId, account.id));

            /** Sessions, credentials and the profile picture all cascade from here. */
            await tx.delete(user).where(eq(user.id, account.id));
        });
    } catch (failure) {
        if (failure instanceof HasOwnedFamilies) {
            const names = failure.families.join(', ');
            return Response.json(
                {
                    error: `Make someone else an owner of ${names} before deleting your account`,
                },
                { status: 409 }
            );
        }
        throw failure;
    }

    return Response.json({ deleted: true });
}
