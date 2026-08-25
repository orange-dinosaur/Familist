/**
 * FamilyStore backed by a collection's API routes.
 *
 * Online only: every method is a request, and the cache exists to serve
 * `subscribe` rather than to answer reads on its own. Scoping is the server's
 * job - the routes resolve the family from the session - so nothing here ever
 * sends a family id.
 */

import { apiFetch } from '@/auth/client';
import type { Entity, FamilyStore } from '@/store/family-store';

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

export function createRemoteStore<T extends Entity>({
    path,
    one,
    many,
}: RemoteCollection): FamilyStore<T> {
    let items: T[] = [];
    let loaded: Promise<void> | null = null;
    const listeners = new Set<(items: T[]) => void>();

    const emit = () => {
        const snapshot = [...items];
        listeners.forEach((listener) => listener(snapshot));
    };

    /**
     * A read that failed is not a read that happened: the collection is left
     * empty so nothing waits on it forever, and the next call asks again.
     */
    const load = () => {
        if (!loaded) {
            loaded = send(path)
                .then((body) => {
                    items = (body[many] as T[]) ?? [];
                })
                .catch(() => {
                    items = [];
                    loaded = null;
                });
        }
        return loaded;
    };

    return {
        async list() {
            await load();
            return [...items];
        },

        /**
         * Appended rather than sorted in. Every route orders by day first and
         * creation second, and the screens group by day, so a record created
         * now belongs last within its own day wherever it lands in the array.
         */
        async create(input) {
            await load();
            const body = await send(path, withBody('POST', input));
            const created = body[one] as T;
            items = [...items, created];
            emit();
            return created;
        },

        async update(id, changes) {
            await load();
            const body = await send(
                `${path}/${id}`,
                withBody('PATCH', changes)
            );
            const updated = body[one] as T;
            items = items.map((item) => (item.id === id ? updated : item));
            emit();
            return updated;
        },

        async remove(id) {
            await load();
            try {
                await send(`${path}/${id}`, { method: 'DELETE' });
            } catch (error) {
                /** Removing what is not there succeeds, and a 404 says it is not there. */
                const gone =
                    error instanceof StoreError && error.status === 404;
                if (!gone) throw error;
            }
            items = items.filter((item) => item.id !== id);
            emit();
        },

        subscribe(listener) {
            listeners.add(listener);
            void load().then(() => {
                if (listeners.has(listener)) {
                    listener([...items]);
                }
            });
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
