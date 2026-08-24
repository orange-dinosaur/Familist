/**
 * Subscribes to a store collection.
 *
 * The store emits the whole collection once it is available, so the first
 * emission is what clears `loading`.
 */

import { useEffect, useState } from 'react';

import type { Entity, FamilyStore } from '@/store/family-store';

export function useStoreCollection<T extends Entity>(store: FamilyStore<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return store.subscribe((next) => {
            setItems(next);
            setLoading(false);
        });
    }, [store]);

    return { items, loading };
}
