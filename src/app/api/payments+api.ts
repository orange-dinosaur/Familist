/**
 * Payments with a deadline, with the same four scoping rules as the other
 * collections.
 *
 * The checker rule is the one from `.notes/data_management/roles.md`: `paid`
 * is the only field they may touch, and only on the payments they are the
 * payer of. Creating and deleting stay with owners and editors.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

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
    idError,
    nameError,
    notFound,
    optionalDayError,
    PAYMENT_COLUMNS,
    readSince,
    retriedCreate,
} from '@/db/content';
import { payment } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const payments = await db
        .select(PAYMENT_COLUMNS)
        .from(payment)
        .where(
            and(
                eq(payment.familyId, membership.familyId),
                since
                    ? gte(payment.updatedAt, since)
                    : isNull(payment.deletedAt)
            )
        )
        .orderBy(asc(payment.dueOn), asc(payment.id));

    return Response.json({ payments });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick payments off');
    }

    let body: {
        id?: unknown;
        name?: unknown;
        amount?: unknown;
        currency?: unknown;
        dueOn?: unknown;
        paid?: unknown;
        paidOn?: unknown;
        payerId?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, name, amount, currency, dueOn, paid, paidOn, payerId } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    /** A payment already settled may be written down, so `paidOn` is taken. */
    const invalid =
        nameError(name) ??
        amountError(amount) ??
        currencyError(currency) ??
        dayError(dueOn) ??
        optionalDayError(paidOn);
    if (invalid) return badRequest(invalid);

    if (paid !== undefined && typeof paid !== 'boolean') {
        return badRequest('Invalid paid');
    }

    if (
        payerId !== undefined &&
        payerId !== null &&
        typeof payerId !== 'string'
    ) {
        return badRequest('Invalid payer');
    }

    const payer = typeof payerId === 'string' ? payerId : null;

    if (payer && !(await assigneeInFamily(membership.familyId, payer))) {
        return notFound('That member is not in your family');
    }

    const settled = paid === true;

    const [created] = await db
        .insert(payment)
        .values({
            id: recordId,
            familyId: membership.familyId,
            name: (name as string).trim(),
            amount: amount as number,
            currency: currency as Currency,
            dueOn: dueOn as string,
            paid: settled,
            paidOn:
                settled && typeof paidOn === 'string'
                    ? (paidOn as string)
                    : null,
            payerId: payer,
        })
        .onConflictDoNothing()
        .returning(PAYMENT_COLUMNS);

    if (created) return Response.json({ payment: created }, { status: 201 });

    return retriedCreate(
        payment,
        PAYMENT_COLUMNS,
        'payment',
        recordId,
        membership.familyId
    );
}
