/**
 * To-dos: chores with a priority, and the same four scoping rules from
 * `.notes/data_management/familist-adaptation.md`.
 *
 * Deliberately a parallel file rather than a shared generic handler. The rules
 * live once in `@/db/content`; what stays duplicated is which table and which
 * fields each collection has, and folding that into one clever function would
 * hide exactly the part a reviewer needs to see.
 */

import { and, asc, eq, gte, isNull } from 'drizzle-orm';

import { getMembership, unauthorized } from '@/auth/session';
import { type TodoItem } from '@/constants/mock-data';
import { db } from '@/db';
import {
    assigneeInFamily,
    badRequest,
    dayError,
    forbidden,
    idError,
    labelError,
    notFound,
    priorityError,
    readSince,
    retriedCreate,
    TODO_COLUMNS,
} from '@/db/content';
import { todo } from '@/db/schema';
import { createId } from '@/utils/id';

export async function GET(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    const { at: since, error: invalid } = readSince(request);
    if (invalid) return badRequest(invalid);

    const todos = await db
        .select(TODO_COLUMNS)
        .from(todo)
        .where(
            and(
                eq(todo.familyId, membership.familyId),
                since ? gte(todo.updatedAt, since) : isNull(todo.deletedAt)
            )
        )
        .orderBy(asc(todo.day), asc(todo.createdAt), asc(todo.id));

    return Response.json({ todos });
}

export async function POST(request: Request): Promise<Response> {
    const membership = await getMembership(request);
    if (!membership) return unauthorized();

    if (membership.role === 'checker') {
        return forbidden('You can only tick off what is assigned to you');
    }

    let body: {
        id?: unknown;
        label?: unknown;
        day?: unknown;
        priority?: unknown;
        assigneeId?: unknown;
    };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const { id, label, day, priority, assigneeId } = body;

    /** A client mints this when it creates a record it cannot yet send. */
    if (id !== undefined) {
        const invalidId = idError(id);
        if (invalidId) return badRequest(invalidId);
    }

    const recordId = typeof id === 'string' ? id : createId();

    /** `priority` is `NOT NULL` with no default, so the route asks for it. */
    const invalid =
        labelError(label) ?? dayError(day) ?? priorityError(priority);
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
        .insert(todo)
        .values({
            id: recordId,
            familyId: membership.familyId,
            label: (label as string).trim(),
            day: day as string,
            priority: priority as TodoItem['priority'],
            assigneeId: assignee,
        })
        .onConflictDoNothing()
        .returning(TODO_COLUMNS);

    if (created) return Response.json({ todo: created }, { status: 201 });

    return retriedCreate(
        todo,
        TODO_COLUMNS,
        'todo',
        recordId,
        membership.familyId
    );
}
