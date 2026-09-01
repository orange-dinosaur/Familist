/**
 * One to-do. The checker rule is the same as for chores and matters for the
 * same reason: `done` is the only field they may touch, and only on rows
 * assigned to them, with that condition in the `WHERE` rather than in a read.
 *
 * `priority` is an ordinary editable field. It is not something a checker may
 * change, which follows from the allowlist without needing its own rule.
 *
 * `completedAt` is derived here rather than taken from the body: a client
 * sends its own so the row it is holding sorts right before the answer comes
 * back, and two devices ticking the same to-do off would otherwise disagree
 * about when it was done.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type TodoItem } from '@/constants/types';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    forbidden,
    labelError,
    notFound,
    optionalDayError,
    priorityError,
    TODO_COLUMNS,
} from '@/db/content';
import { todo } from '@/db/schema';

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

    const tickingOff = ['done', 'completedAt'];

    if (checker && submitted.some((field) => !tickingOff.includes(field))) {
        return forbidden('You can only tick to-dos off');
    }

    const changes: {
        label?: string;
        done?: boolean;
        completedAt?: Date | null;
        day?: string | null;
        priority?: TodoItem['priority'];
        assigneeId?: string | null;
    } = {};

    if ('label' in body) {
        const invalid = labelError(body.label);
        if (invalid) return badRequest(invalid);
        changes.label = (body.label as string).trim();
    }

    if ('done' in body) {
        if (typeof body.done !== 'boolean') return badRequest('Invalid done');
        changes.done = body.done;
        changes.completedAt = body.done ? new Date() : null;
    }

    /** A `day` sent as null is a due date being taken off. */
    if ('day' in body) {
        const invalid = optionalDayError(body.day);
        if (invalid) return badRequest(invalid);
        changes.day = typeof body.day === 'string' ? body.day : null;
    }

    if ('priority' in body) {
        const invalid = priorityError(body.priority);
        if (invalid) return badRequest(invalid);
        changes.priority = body.priority as TodoItem['priority'];
    }

    if ('assigneeId' in body) {
        const { assigneeId } = body;
        if (assigneeId !== null && typeof assigneeId !== 'string') {
            return badRequest('Invalid assignee');
        }
        if (
            typeof assigneeId === 'string' &&
            !(await assigneeInFamily(membership.familyId, assigneeId))
        ) {
            return notFound('That member is not in your family');
        }
        changes.assigneeId = assigneeId;
    }

    const updated = await db
        .update(todo)
        .set(changes)
        .where(
            and(
                eq(todo.id, id),
                eq(todo.familyId, membership.familyId),
                isNull(todo.deletedAt),
                ...(checker ? [eq(todo.assigneeId, membership.memberId)] : [])
            )
        )
        .returning(TODO_COLUMNS);

    if (updated.length === 0) {
        return notFound(
            checker
                ? 'That to-do is not yours to change'
                : 'That to-do is no longer there'
        );
    }

    return Response.json({ todo: updated[0] });
}

export async function DELETE(
    request: Request,
    { id }: { id: string }
): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick to-dos off');
    }

    const deleted = await db
        .update(todo)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(todo.id, id),
                eq(todo.familyId, membership.familyId),
                isNull(todo.deletedAt)
            )
        )
        .returning({ id: todo.id });

    if (deleted.length === 0) {
        return notFound('That to-do is no longer there');
    }

    return Response.json({ todo: { id: deleted[0].id } });
}
