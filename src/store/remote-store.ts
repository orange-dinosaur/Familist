/**
 * FamilyStore backed by a collection's API routes.
 *
 * Online only: every method is a request, and the cache exists to serve
 * `subscribe` rather than to answer reads on its own.
 */

import type { Entity, FamilyStore } from '@/store/family-store';
import {
    createRemoteClient,
    type RemoteCollection,
} from '@/store/remote-client';

export function createRemoteStore<T extends Entity>(
    collection: RemoteCollection
): FamilyStore<T> {
    const client = createRemoteClient<T>(collection);

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
            loaded = client
                .pull(null)
                .then((pulled) => {
                    items = pulled;
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
            const created = await client.create(input);
            items = [...items, created];
            emit();
            return created;
        },

        async update(id, changes) {
            await load();
            const updated = await client.update(id, changes);
            items = items.map((item) => (item.id === id ? updated : item));
            emit();
            return updated;
        },

        async remove(id) {
            await load();
            await client.remove(id);
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
