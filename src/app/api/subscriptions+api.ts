/**
 * Subscriptions, with the same four scoping rules as the other collections
 * and one rule of their own: a checker may not write to them at all. A
 * subscription has no "done" to tick, so there is nothing here that falls
 * within what a checker may touch.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type Currency } from '@/constants/currencies';
import { type SubscriptionItem } from '@/constants/types';
import { db } from '@/db';
import {
    amountError,
    assigneeInFamily,
    badRequest,
    currencyError,
    cycleError,
    dayError,
    emojiError,
    forbidden,
    idError,
    nameError,
    notFound,
    readSince,
    retriedCreate,
    SUBSCRIPTION_COLUMNS,
} from '@/db/content';
import { subscription } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const subscriptions = await db
        .select(SUBSCRIPTION_COLUMNS)
        .from(subscription)
        .where(
            and(
                eq(subscription.familyId, membership.familyId),
                since
                    ? gte(subscription.updatedAt, since)
                    : isNull(subscription.deletedAt)
            )
        )
        .orderBy(asc(subscription.nextRenewal), asc(subscription.id));

    return Response.json({ subscriptions });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You cannot change subscriptions');
    }

    let body: {
        id?: unknown;
        name?: unknown;
        emoji?: unknown;
        amount?: unknown;
        currency?: unknown;
        cycle?: unknown;
        nextRenewal?: unknown;
        payerId?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, name, emoji, amount, currency, cycle, nextRenewal, payerId } =
        body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    const invalid =
        nameError(name) ??
        amountError(amount) ??
        currencyError(currency) ??
        cycleError(cycle) ??
        dayError(nextRenewal);
    if (invalid) return badRequest(invalid);

    /** The column is `NOT NULL DEFAULT ''`, so no emoji is a valid one. */
    if (emoji !== undefined) {
        const invalidEmoji = emojiError(emoji);
        if (invalidEmoji) return badRequest(invalidEmoji);
    }

    if (
        payerId !== undefined &&
        payerId !== null &&
        typeof payerId !== 'string'
    )
        return badRequest('Invalid payer');

    const payer = typeof payerId === 'string' ? payerId : null;

    if (payer && !(await assigneeInFamily(membership.familyId, payer))) {
        return notFound('That member is not in your family');
    }

    const [created] = await db
        .insert(subscription)
        .values({
            id: recordId,
            familyId: membership.familyId,
            name: (name as string).trim(),
            emoji: typeof emoji === 'string' ? emoji : '',
            amount: amount as number,
            currency: currency as Currency,
            cycle: cycle as SubscriptionItem['cycle'],
            nextRenewal: nextRenewal as string,
            payerId: payer,
        })
        .onConflictDoNothing()
        .returning(SUBSCRIPTION_COLUMNS);

    if (created) {
        return Response.json({ subscription: created }, { status: 201 });
    }

    return retriedCreate(
        subscription,
        SUBSCRIPTION_COLUMNS,
        'subscription',
        recordId,
        membership.familyId
    );
}
