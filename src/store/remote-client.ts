/**
 * The requests a collection's API routes answer.
 *
 * No state of its own: it does not cache, does not emit and does not know who
 * is asking. Scoping is the server's job - the routes resolve the family from
 * the session - so nothing here ever sends a family id.
 */

import { apiFetch } from '@/auth/client';
import type { Changes, Entity } from '@/store/family-store';

/**
 * A refusal the server put into words. A dropped connection is not one of
 * these, which is how a caller tells the two apart.
 */
export class StoreError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

/** The server's own words when it refused, and a fallback when it never answered. */
export function writeFailure(error: unknown, fallback: string): string {
    return error instanceof StoreError ? error.message : fallback;
}

export interface RemoteCollection {
    /** The list route, `/api/meals`; one record is that path plus its id. */
    path: string;
    /** The keys the routes wrap their answers in: `meal` and `meals`. */
    one: string;
    many: string;
}

export interface RemoteClient<T extends Entity> {
    /**
     * The live collection, or - given the largest `updatedAt` already seen -
     * everything touched since, tombstones included.
     */
    pull(since: string | null): Promise<T[]>;
    create(input: Omit<T, 'id'>): Promise<T>;
    update(id: string, changes: Changes<T>): Promise<T>;
    remove(id: string): Promise<void>;
}

async function send(
    path: string,
    init?: RequestInit
): Promise<Record<string, unknown>> {
    const res = await apiFetch(path, init);
    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new StoreError(
            typeof body?.error === 'string' ? body.error : 'That did not work.',
            res.status
        );
    }

    return body ?? {};
}

const withBody = (method: string, payload: unknown): RequestInit => ({
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
});

export function createRemoteClient<T extends Entity>({
    path,
    one,
    many,
}: RemoteCollection): RemoteClient<T> {
    return {
        async pull(since) {
            const query = since ? `?since=${encodeURIComponent(since)}` : '';
            const body = await send(`${path}${query}`);
            return (body[many] as T[]) ?? [];
        },

        async create(input) {
            const body = await send(path, withBody('POST', input));
            return body[one] as T;
        },

        async update(id, changes) {
            const body = await send(
                `${path}/${id}`,
                withBody('PATCH', changes)
            );
            return body[one] as T;
        },

        async remove(id) {
            try {
                await send(`${path}/${id}`, { method: 'DELETE' });
            } catch (error) {
                /** Removing what is not there succeeds, and a 404 says it is not there. */
                const gone =
                    error instanceof StoreError && error.status === 404;
                if (!gone) throw error;
            }
        },
    };
}
