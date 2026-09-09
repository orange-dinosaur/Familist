/**
 * The signed-in person's own settings. `GET` reads them, `PATCH` changes one.
 *
 * Per-user, not per-family: the row is found from the session, so there is no
 * membership to resolve and nothing in the body selects anything. Two people
 * in the same house are meant to disagree about dark mode.
 */

import { eq } from 'drizzle-orm';

import { getSessionUser, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { appearanceError, badRequest, PREFERENCE_COLUMNS } from '@/db/content';
import { userPreference } from '@/db/schema';
import { type Appearance } from '@/constants/types';
import { createId } from '@/utils/id';

/** A person who has never chosen has chosen the default. */
const DEFAULTS: { appearance: Appearance } = { appearance: 'system' };

export async function GET(request: Request): Promise<Response> {
    const account = await getSessionUser(request);
    if (!account) return unauthorized();

    const [row] = await db
        .select(PREFERENCE_COLUMNS)
        .from(userPreference)
        .where(eq(userPreference.userId, account.id))
        .limit(1);

    return Response.json(row ?? DEFAULTS);
}

export async function PATCH(request: Request): Promise<Response> {
    const account = await getSessionUser(request);
    if (!account) return unauthorized();

    let body: { appearance?: unknown };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid body');
    }

    const invalid = appearanceError(body.appearance);
    if (invalid) return badRequest(invalid);

    const appearance = body.appearance as Appearance;

    await db
        .insert(userPreference)
        .values({ id: createId(), userId: account.id, appearance })
        .onConflictDoUpdate({
            target: userPreference.userId,
            set: { appearance },
        });

    return Response.json({ appearance });
}
