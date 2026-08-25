/**
 * FamilyStore with local storage as the read path and the server as the truth.
 *
 * Screens read what is already on the device, so the app opens with data and
 * survives a refresh with no connection. Behind that, a pull reconciles the
 * collection against the server. Writes still go straight to the server: the
 * outbox that lets them be made offline is the next step.
 */

import type { Entity, FamilyStore } from '@/store/family-store';
import { getItem, setItem } from '@/store/key-value';
import { createLocalStore } from '@/store/local-store';
import {
    createRemoteClient,
    type RemoteCollection,
} from '@/store/remote-client';

/**
 * Both sides send `updatedAt` as the same ISO-8601 UTC string the server
 * produced, which is why comparing them as text is sound rather than merely
 * convenient. A record the client has only just built has none, and loses.
 */
function isNewer(incoming: Entity, mine: Entity): boolean {
    return (incoming.updatedAt ?? '') > (mine.updatedAt ?? '');
}

function merge<T extends Entity>(current: T[], incoming: T[]): T[] {
    const byId = new Map(current.map((item) => [item.id, item]));

    for (const record of incoming) {
        if (record.deletedAt) {
            byId.delete(record.id);
            continue;
        }

        const mine = byId.get(record.id);
        if (!mine || isNewer(record, mine)) {
            byId.set(record.id, record);
        }
    }

    /** Setting an existing key keeps its position, so new records land last. */
    return [...byId.values()];
}

export function createSyncedStore<T extends Entity>(
    key: string,
    collection: RemoteCollection
): FamilyStore<T> {
    const local = createLocalStore<T>(key);
    const remote = createRemoteClient<T>(collection);

    /** The largest `updatedAt` reconciled so far, kept beside the collection. */
    const mark = `${key}.since`;

    const highest = (records: T[], from: string | null) =>
        records.reduce(
            (latest, record) =>
                record.updatedAt && record.updatedAt > (latest ?? '')
                    ? record.updatedAt
                    : latest,
            from
        );

    const pull = async () => {
        const since = await getItem(mark);
        const incoming = await remote.pull(since);

        /**
         * Without a mark this is the live collection rather than a set of
         * changes, so it replaces what is here. That is what clears records
         * deleted while the device was away, which an incremental read reports
         * as tombstones and a full one does not report at all.
         */
        if (incoming.length > 0 || !since) {
            const next = since ? merge(await local.list(), incoming) : incoming;
            await local.replace(next);
        }

        /** Written last: a failure between the two re-pulls rather than skips. */
        const latest = highest(incoming, since);
        if (latest) await setItem(mark, latest);
    };

    let pulled: Promise<void> | null = null;

    const sync = () => {
        if (!pulled) {
            pulled = pull().catch(() => {
                /** Offline or refused; what is on the device stands. */
                pulled = null;
            });
        }
        return pulled;
    };

    return {
        list() {
            return local.list();
        },

        async create(input) {
            const created = await remote.create(input);
            await local.replace([...(await local.list()), created]);
            return created;
        },

        async update(id, changes) {
            const updated = await remote.update(id, changes);
            const current = await local.list();
            await local.replace(
                current.map((item) => (item.id === id ? updated : item))
            );
            return updated;
        },

        async remove(id) {
            await remote.remove(id);
            const current = await local.list();
            await local.replace(current.filter((item) => item.id !== id));
        },

        subscribe(listener) {
            const unsubscribe = local.subscribe(listener);
            void sync();
            return unsubscribe;
        },
    };
}
