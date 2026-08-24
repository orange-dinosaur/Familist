/**
 * FamilyStore backed by platform key/value storage.
 *
 * Records are held in memory and the whole collection is rewritten on every
 * change. When storage is unavailable the store still works for the session.
 */

import type { Entity, FamilyStore } from '@/store/family-store';
import { getItem, setItem } from '@/store/key-value';
import { createId } from '@/utils/id';

const VERSION = 1;

interface Envelope<T> {
    version: number;
    items: T[];
}

export function createLocalStore<T extends Entity>(
    key: string,
    seed: T[] = []
): FamilyStore<T> {
    let items: T[] = [];
    let loaded: Promise<void> | null = null;
    const listeners = new Set<(items: T[]) => void>();

    const emit = () => {
        const snapshot = [...items];
        listeners.forEach((listener) => listener(snapshot));
    };

    const persist = async () => {
        try {
            const envelope: Envelope<T> = { version: VERSION, items };
            await setItem(key, JSON.stringify(envelope));
        } catch {
            // Storage unavailable; the session carries on in memory.
        }
    };

    const read = async () => {
        try {
            const raw = await getItem(key);
            if (raw) {
                const stored = JSON.parse(raw) as Envelope<T>;
                if (
                    stored?.version === VERSION &&
                    Array.isArray(stored.items)
                ) {
                    items = stored.items;
                    return;
                }
            }
        } catch {
            // Unreadable or unparseable; fall through to the seed.
        }
        items = [...seed];
        await persist();
    };

    const load = () => {
        if (!loaded) {
            loaded = read();
        }
        return loaded;
    };

    return {
        async list() {
            await load();
            return [...items];
        },

        async create(input) {
            await load();
            const created = { ...input, id: createId() } as T;
            items = [...items, created];
            emit();
            await persist();
            return created;
        },

        async update(id, changes) {
            await load();
            const existing = items.find((item) => item.id === id);
            if (!existing) {
                throw new Error(`No record with id ${id}`);
            }
            const updated = { ...existing, ...changes };
            items = items.map((item) => (item.id === id ? updated : item));
            emit();
            await persist();
            return updated;
        },

        async remove(id) {
            await load();
            const remaining = items.filter((item) => item.id !== id);
            if (remaining.length === items.length) return;
            items = remaining;
            emit();
            await persist();
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
