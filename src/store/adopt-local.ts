/**
 * Reading what an earlier version of the app left on the device.
 *
 * Before step 23 every collection lived in `localStorage` under an unscoped
 * key, with no family behind it. Signing in now would strand that data: the
 * store reads a key with the family id in it and never looks at the old one.
 * `SyncedStore` hands what is here to the family before its first pull.
 */

import type { Entity } from '@/store/family-store';
import { getItem, removeItem } from '@/store/key-value';

/** What `createLocalStore` wrote: the only shape worth reading back. */
interface Envelope {
    version: number;
    items: unknown[];
}

/**
 * An assignee cannot come with it. Those ids belong to the members the app
 * kept locally before step 20d, which have no `family_member` row behind them,
 * and the routes refuse an assignee that is not in the family. The record is
 * worth keeping without one; refusing the whole thing over it is not.
 *
 * The sync timestamps go too, on the same grounds: whatever they said, these
 * records have never been near the server.
 */
function clean<T extends Entity>(record: Record<string, unknown>): T {
    const { assigneeId, updatedAt, deletedAt, ...rest } = record;
    const kept = 'assigneeId' in record ? { ...rest, assigneeId: null } : rest;
    return kept as unknown as T;
}

export async function readLegacy<T extends Entity>(key: string): Promise<T[]> {
    try {
        const raw = await getItem(key);
        if (!raw) return [];

        const stored = JSON.parse(raw) as Envelope;
        if (stored?.version !== 1 || !Array.isArray(stored.items)) return [];

        return stored.items
            .filter(
                (item): item is Record<string, unknown> =>
                    typeof item === 'object' && item !== null && 'id' in item
            )
            .map((item) => clean<T>(item));
    } catch {
        /** Unreadable, and reading it again next time will not help. */
        return [];
    }
}

export function forgetLegacy(key: string): Promise<void> {
    return removeItem(key);
}
