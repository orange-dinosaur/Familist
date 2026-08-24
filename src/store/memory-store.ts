/**
 * In-memory FamilyStore. Holds records for the lifetime of the process.
 */

import type { Entity, FamilyStore } from '@/store/family-store';
import { createId } from '@/utils/id';

export function createMemoryStore<T extends Entity>(
    seed: T[] = []
): FamilyStore<T> {
    let items: T[] = [...seed];
    const listeners = new Set<(items: T[]) => void>();

    const emit = () => {
        const snapshot = [...items];
        listeners.forEach((listener) => listener(snapshot));
    };

    return {
        async list() {
            return [...items];
        },

        async create(input) {
            const created = { ...input, id: createId() } as T;
            items = [...items, created];
            emit();
            return created;
        },

        async update(id, changes) {
            const existing = items.find((item) => item.id === id);
            if (!existing) {
                throw new Error(`No record with id ${id}`);
            }
            const updated = { ...existing, ...changes };
            items = items.map((item) => (item.id === id ? updated : item));
            emit();
            return updated;
        },

        async remove(id) {
            const remaining = items.filter((item) => item.id !== id);
            if (remaining.length === items.length) return;
            items = remaining;
            emit();
        },

        subscribe(listener) {
            listeners.add(listener);
            listener([...items]);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
