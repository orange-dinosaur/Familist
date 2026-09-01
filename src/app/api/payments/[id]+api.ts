/**
 * One payment. The checker rule is the same as for chores and to-dos: `paid`
 * is the only field they may touch, and only on the payments they are the
 * payer of, with that condition in the `WHERE` rather than in a read.
 *
 * `paidOn` is taken from the body rather than derived here, which is the one
 * place this differs from `todo.completedAt`. It is a calendar day, and every
 * day key in this app is the day on the device's clock - the server's own
 * could be the one before or after. What the route does enforce is that an
 * unpaid payment has no day: unticking clears it whatever the body said.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type Currency } from '@/constants/currencies';
import { db } from '@/db';
import {
    amountError,
    assigneeInFamily,
    badRequest,
    currencyError,
    dayError,
    forbidden,
    nameError,
    notFound,
    optionalDayError,
    PAYMENT_COLUMNS,
} from '@/db/content';
import { payment } from '@/db/schema';

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

    const tickingOff = ['paid', 'paidOn'];

    if (checker && submitted.some((field) => !tickingOff.includes(field))) {
        return forbidden('You can only tick payments off');
    }

    const changes: {
        name?: string;
        amount?: number;
        currency?: Currency;
        dueOn?: string;
        paid?: boolean;
        paidOn?: string | null;
        payerId?: string | null;
    } = {};

    if ('name' in body) {
        const invalid = nameError(body.name);
        if (invalid) return badRequest(invalid);
        changes.name = (body.name as string).trim();
    }

    if ('amount' in body) {
        const invalid = amountError(body.amount);
        if (invalid) return badRequest(invalid);
        changes.amount = body.amount as number;
    }

    if ('currency' in body) {
        const invalid = currencyError(body.currency);
        if (invalid) return badRequest(invalid);
        changes.currency = body.currency as Currency;
    }

    if ('dueOn' in body) {
        const invalid = dayError(body.dueOn);
        if (invalid) return badRequest(invalid);
        changes.dueOn = body.dueOn as string;
    }

    if ('paidOn' in body) {
        const invalid = optionalDayError(body.paidOn);
        if (invalid) return badRequest(invalid);
        changes.paidOn = typeof body.paidOn === 'string' ? body.paidOn : null;
    }

    /** Last, so that unticking clears the day whatever order the body had. */
    if ('paid' in body) {
        if (typeof body.paid !== 'boolean') return badRequest('Invalid paid');
        changes.paid = body.paid;
        if (!body.paid) changes.paidOn = null;
    }

    if ('payerId' in body) {
        const { payerId } = body;
        if (payerId !== null && typeof payerId !== 'string') {
            return badRequest('Invalid payer');
        }
        if (
            typeof payerId === 'string' &&
            !(await assigneeInFamily(membership.familyId, payerId))
        ) {
            return notFound('That member is not in your family');
        }
        changes.payerId = payerId;
    }

    const updated = await db
        .update(payment)
        .set(changes)
        .where(
            and(
                eq(payment.id, id),
                eq(payment.familyId, membership.familyId),
                isNull(payment.deletedAt),
                ...(checker ? [eq(payment.payerId, membership.memberId)] : [])
            )
        )
        .returning(PAYMENT_COLUMNS);

    if (updated.length === 0) {
        return notFound(
            checker
                ? 'That payment is not yours to change'
                : 'That payment is no longer there'
        );
    }

    return Response.json({ payment: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick payments off');
    }

    const deleted = await db
        .update(payment)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(payment.id, id),
                eq(payment.familyId, membership.familyId),
                isNull(payment.deletedAt)
            )
        )
        .returning({ id: payment.id });

    if (deleted.length === 0) {
        return notFound('That payment is no longer there');
    }

    return Response.json({ payment: { id: deleted[0].id } });
}
