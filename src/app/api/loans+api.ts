/**
 * The things the family lent out or borrowed, with the same four scoping rules
 * as the other collections.
 *
 * The checker rule is the one from `.notes/data_management/roles.md`:
 * `returned` is this collection's done-like boolean, and a checker may flip it
 * only on the loans they are the member of. Creating and deleting stay with
 * owners and editors.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type LoanItem } from '@/constants/types';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    dayError,
    directionError,
    forbidden,
    idError,
    itemError,
    LOAN_COLUMNS,
    nameError,
    notFound,
    optionalDayError,
    readSince,
    retriedCreate,
} from '@/db/content';
import { loan } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const loans = await db
        .select(LOAN_COLUMNS)
        .from(loan)
        .where(
            and(
                eq(loan.familyId, membership.familyId),
                since ? gte(loan.updatedAt, since) : isNull(loan.deletedAt)
            )
        )
        .orderBy(asc(loan.day), asc(loan.id));

    return Response.json({ loans });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only mark loans returned');
    }

    let body: {
        id?: unknown;
        item?: unknown;
        direction?: unknown;
        counterparty?: unknown;
        memberId?: unknown;
        day?: unknown;
        returned?: unknown;
        returnedOn?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const {
        id,
        item,
        direction,
        counterparty,
        memberId,
        day,
        returned,
        returnedOn,
    } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    /** A loan already back may be written down, so `returnedOn` is taken. */
    const invalid =
        itemError(item) ??
        directionError(direction) ??
        nameError(counterparty) ??
        dayError(day) ??
        optionalDayError(returnedOn);
    if (invalid) return badRequest(invalid);

    if (returned !== undefined && typeof returned !== 'boolean') {
        return badRequest('Invalid returned');
    }

    if (
        memberId !== undefined &&
        memberId !== null &&
        typeof memberId !== 'string'
    ) {
        return badRequest('Invalid member');
    }

    const member = typeof memberId === 'string' ? memberId : null;

    if (member && !(await assigneeInFamily(membership.familyId, member))) {
        return notFound('That member is not in your family');
    }

    const back = returned === true;

    const [created] = await db
        .insert(loan)
        .values({
            id: recordId,
            familyId: membership.familyId,
            item: (item as string).trim(),
            direction: direction as LoanItem['direction'],
            counterparty: (counterparty as string).trim(),
            memberId: member,
            day: day as string,
            returned: back,
            returnedOn:
                back && typeof returnedOn === 'string'
                    ? (returnedOn as string)
                    : null,
        })
        .onConflictDoNothing()
        .returning(LOAN_COLUMNS);

    if (created) return Response.json({ loan: created }, { status: 201 });

    return retriedCreate(
        loan,
        LOAN_COLUMNS,
        'loan',
        recordId,
        membership.familyId
    );
}
