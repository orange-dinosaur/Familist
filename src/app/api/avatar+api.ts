/**
 * The signed-in person's profile picture. `POST` replaces it, `DELETE` takes
 * it away; reading one is `avatar/[id]`, which needs no session because the id
 * is the capability.
 *
 * The bytes arrive base64 in JSON rather than as a multipart upload: the app
 * has already resized the picture to something small, and one encoding that
 * works the same on native and on web is worth the third it costs.
 */

import { eq } from 'drizzle-orm';

import { getSessionUser, unauthorized } from '@/auth/session';
import { db } from '@/db';
import { user, userAvatar } from '@/db/schema';
import { createId } from '@/utils/id';

/** Comfortably more than a 256px square, and far less than a phone photo. */
const MAX_BYTES = 300_000;

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request): Promise<Response> {
    const account = await getSessionUser(request);
    if (!account) return unauthorized();

    let body: { data?: unknown; contentType?: unknown };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { data, contentType } = body;

    if (typeof data !== 'string' || !data) {
        return Response.json(
            { error: 'An image is required' },
            { status: 400 }
        );
    }
    if (typeof contentType !== 'string' || !TYPES.includes(contentType)) {
        return Response.json(
            { error: 'That kind of image is not supported' },
            { status: 400 }
        );
    }

    /** Base64 carries four characters for every three bytes it stands for. */
    if (Math.ceil((data.length * 3) / 4) > MAX_BYTES) {
        return Response.json(
            { error: 'That image is too big' },
            { status: 413 }
        );
    }

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
        return Response.json(
            { error: 'That image is not readable' },
            { status: 400 }
        );
    }

    const id = createId();

    /**
     * The row and the pointer to it move together: a picture nothing points at
     * would never be shown, and a pointer to a picture that is not there would
     * be a broken image in every avatar.
     */
    await db.transaction(async (tx) => {
        await tx
            .insert(userAvatar)
            .values({ id, userId: account.id, data, contentType })
            .onConflictDoUpdate({
                target: userAvatar.userId,
                set: { id, data, contentType },
            });

        await tx
            .update(user)
            .set({ image: `/api/avatar/${id}` })
            .where(eq(user.id, account.id));
    });

    return Response.json({ image: `/api/avatar/${id}` }, { status: 201 });
}

export async function DELETE(request: Request): Promise<Response> {
    const account = await getSessionUser(request);
    if (!account) return unauthorized();

    await db.transaction(async (tx) => {
        await tx.delete(userAvatar).where(eq(userAvatar.userId, account.id));
        await tx
            .update(user)
            .set({ image: null })
            .where(eq(user.id, account.id));
    });

    return Response.json({ image: null });
}
