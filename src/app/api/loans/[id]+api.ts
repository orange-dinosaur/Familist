/**
 * One loan. The checker rule is the same as for payments: `returned` is the
 * only thing they may flip, and only on the loans they are the member of, with
 * that condition in the `WHERE` rather than in a read.
 *
 * `returnedOn` is taken from the body rather than derived here, for the reason
 * `payment.paidOn` is: it is a calendar day, and every day key in this app is
 * the day on the device's clock. What the route enforces is that a loan still
 * out has no day - unticking clears it whatever the body said.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type LoanItem } from '@/constants/types';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    dayError,
    directionError,
    forbidden,
    itemError,
    LOAN_COLUMNS,
    nameError,
    notFound,
    optionalDayError,
} from '@/db/content';
import { loan } from '@/db/schema';

export async function PATCH(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const submitted = Object.keys(body);
    if (submitted.length === 0) return badRequest('Nothing to change');

    const checker = membership.role === 'checker';

    const markingReturned = ['returned', 'returnedOn'];

    if (
        checker &&
        submitted.some((field) => !markingReturned.includes(field))
    ) {
        return forbidden('You can only mark loans returned');
    }

    const changes: {
        item?: string;
        direction?: LoanItem['direction'];
        counterparty?: string;
        memberId?: string | null;
        day?: string;
        returned?: boolean;
        returnedOn?: string | null;
    } = {};

    if ('item' in body) {
        const invalid = itemError(body.item);
        if (invalid) return badRequest(invalid);
        changes.item = (body.item as string).trim();
    }

    if ('direction' in body) {
        const invalid = directionError(body.direction);
        if (invalid) return badRequest(invalid);
        changes.direction = body.direction as LoanItem['direction'];
    }

    if ('counterparty' in body) {
        const invalid = nameError(body.counterparty);
        if (invalid) return badRequest(invalid);
        changes.counterparty = (body.counterparty as string).trim();
    }

    if ('day' in body) {
        const invalid = dayError(body.day);
        if (invalid) return badRequest(invalid);
        changes.day = body.day as string;
    }

    if ('returnedOn' in body) {
        const invalid = optionalDayError(body.returnedOn);
        if (invalid) return badRequest(invalid);
        changes.returnedOn =
            typeof body.returnedOn === 'string' ? body.returnedOn : null;
    }

    /** Last, so that unticking clears the day whatever order the body had. */
    if ('returned' in body) {
        if (typeof body.returned !== 'boolean') {
            return badRequest('Invalid returned');
        }
        changes.returned = body.returned;
        if (!body.returned) changes.returnedOn = null;
    }

    if ('memberId' in body) {
        const { memberId } = body;
        if (memberId !== null && typeof memberId !== 'string') {
            return badRequest('Invalid member');
        }
        if (
            typeof memberId === 'string' &&
            !(await assigneeInFamily(membership.familyId, memberId))
        ) {
            return notFound('That member is not in your family');
        }
        changes.memberId = memberId;
    }

    const updated = await db
        .update(loan)
        .set(changes)
        .where(
            and(
                eq(loan.id, id),
                eq(loan.familyId, membership.familyId),
                isNull(loan.deletedAt),
                ...(checker ? [eq(loan.memberId, membership.memberId)] : [])
            )
        )
        .returning(LOAN_COLUMNS);

    if (updated.length === 0) {
        return notFound(
            checker
                ? 'That loan is not yours to change'
                : 'That loan is no longer there'
        );
    }

    return Response.json({ loan: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only mark loans returned');
    }

    const deleted = await db
        .update(loan)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(loan.id, id),
                eq(loan.familyId, membership.familyId),
                isNull(loan.deletedAt)
            )
        )
        .returning({ id: loan.id });

    if (deleted.length === 0) {
        return notFound('That loan is no longer there');
    }

    return Response.json({ loan: { id: deleted[0].id } });
}
