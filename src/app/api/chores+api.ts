/**
 * Chores. The four rules from `.notes/data_management/familist-adaptation.md`
 * apply to every handler here: the session is re-fetched per request, reads are
 * filtered by the caller's `family_id`, writes stamp it from the session rather
 * than the body, and updates and deletes match on record id **and**
 * `family_id`. There is no row-level security underneath.
 *
 * Reads are unrestricted inside a family. Creating is for owners and editors:
 * a checker may only tick off what is assigned to them, which is enforced in
 * `chores/[id]`.
 */

import { and, asc, eq, gt, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    CHORE_COLUMNS,
    dayError,
    forbidden,
    labelError,
    notFound,
    readSince,
} from '@/db/content';
import { chore } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const chores = await db
        .select(CHORE_COLUMNS)
        .from(chore)
        .where(
            and(
                eq(chore.familyId, membership.familyId),
                since ? gt(chore.updatedAt, since) : isNull(chore.deletedAt)
            )
        )
        .orderBy(asc(chore.day), asc(chore.createdAt), asc(chore.id));

    return Response.json({ chores });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick off what is assigned to you');
    }

    let body: { label?: unknown; day?: unknown; assigneeId?: unknown };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { label, day, assigneeId } = body;

    const invalid = labelError(label) ?? dayError(day);
    if (invalid) return badRequest(invalid);

    if (
        assigneeId !== undefined &&
        assigneeId !== null &&
        typeof assigneeId !== 'string'
    ) {
        return badRequest('Invalid assignee');
    }

    const assignee = typeof assigneeId === 'string' ? assigneeId : null;

    if (assignee && !(await assigneeInFamily(membership.familyId, assignee))) {
        return notFound('That member is not in your family');
    }

    const [created] = await db
        .insert(chore)
        .values({
            id: createId(),
            familyId: membership.familyId,
            label: (label as string).trim(),
            day: day as string,
            assigneeId: assignee,
        })
        .returning(CHORE_COLUMNS);

    return Response.json({ chore: created }, { status: 201 });
}
