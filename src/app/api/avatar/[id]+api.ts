/**
 * One profile picture, by the id its URL carries.
 *
 * Deliberately unauthenticated. The id is random and is replaced whenever the
 * picture is, so holding the URL is the permission - which is what lets an
 * `<Image>` load it with no session attached, on a platform that has no cookie
 * jar to attach one from.
 */

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { userAvatar } from '@/db/schema';

export async function GET(
    request: Request,
    { id }: Record<string, string>
): Promise<Response> {
    const [avatar] = await db
        .select({ data: userAvatar.data, contentType: userAvatar.contentType })
        .from(userAvatar)
        .where(eq(userAvatar.id, id))
        .limit(1);

    if (!avatar) return new Response('Not found', { status: 404 });

    const bytes = Buffer.from(avatar.data, 'base64');

    return new Response(bytes, {
        headers: {
            'content-type': avatar.contentType,
            'content-length': String(bytes.byteLength),
            /** The id changes with the picture, so this one never goes stale. */
            'cache-control': 'public, max-age=31536000, immutable',
        },
    });
}
