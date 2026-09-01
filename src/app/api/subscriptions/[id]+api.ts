/**
 * One subscription. There is no checker allowlist here the way there is for
 * to-dos: a checker may not write to subscriptions at all, so both handlers
 * refuse them outright.
 *
 * `nextRenewal` is an ordinary editable field. The Payments screen moves it on
 * by one cycle when a derived renewal row is ticked off, which is the same
 * `PATCH` a family member makes by hand.
 */

import { and, eq, isNull } from 'drizzle-orm';

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
    nameError,
    notFound,
    SUBSCRIPTION_COLUMNS,
} from '@/db/content';
import { subscription } from '@/db/schema';

export async function PATCH(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You cannot change subscriptions');
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    if (Object.keys(body).length === 0) return badRequest('Nothing to change');

    const changes: {
        name?: string;
        emoji?: string;
        amount?: number;
        currency?: Currency;
        cycle?: SubscriptionItem['cycle'];
        nextRenewal?: string;
        payerId?: string | null;
    } = {};

    if ('name' in body) {
        const invalid = nameError(body.name);
        if (invalid) return badRequest(invalid);
        changes.name = (body.name as string).trim();
    }

    if ('emoji' in body) {
        const invalid = emojiError(body.emoji);
        if (invalid) return badRequest(invalid);
        changes.emoji = body.emoji as string;
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

    if ('cycle' in body) {
        const invalid = cycleError(body.cycle);
        if (invalid) return badRequest(invalid);
        changes.cycle = body.cycle as SubscriptionItem['cycle'];
    }

    if ('nextRenewal' in body) {
        const invalid = dayError(body.nextRenewal);
        if (invalid) return badRequest(invalid);
        changes.nextRenewal = body.nextRenewal as string;
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
        .update(subscription)
        .set(changes)
        .where(
            and(
                eq(subscription.id, id),
                eq(subscription.familyId, membership.familyId),
                isNull(subscription.deletedAt)
            )
        )
        .returning(SUBSCRIPTION_COLUMNS);

    if (updated.length === 0) {
        return notFound('That subscription is no longer there');
    }

    return Response.json({ subscription: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You cannot change subscriptions');
    }

    const deleted = await db
        .update(subscription)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(subscription.id, id),
                eq(subscription.familyId, membership.familyId),
                isNull(subscription.deletedAt)
            )
        )
        .returning({ id: subscription.id });

    if (deleted.length === 0) {
        return notFound('That subscription is no longer there');
    }

    return Response.json({ subscription: { id: deleted[0].id } });
}
