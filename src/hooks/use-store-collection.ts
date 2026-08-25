/**
 * Subscribes to a store collection.
 *
 * The store emits the whole collection once it is available, so the first
 * emission is what clears `loading`. A null store is the signed-out or
 * family-less case: there is nothing to read and nothing to wait for.
 */

import { useEffect, useState } from 'react';

import type { Entity, FamilyStore } from '@/store/family-store';

export function useStoreCollection<T extends Entity>(
    store: FamilyStore<T> | null
) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setItems([]);

        if (!store) {
            setLoading(false);
            return;
        }

        setLoading(true);
        return store.subscribe((next) => {
            setItems(next);
            setLoading(false);
        });
    }, [store]);

    return { items, loading };
}
