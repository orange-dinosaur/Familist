/**
 * FamilyStore with local storage as the read path and the server as the truth.
 *
 * Screens read what is already on the device, so the app opens with data and
 * survives a refresh with no connection. Writes apply locally at once and are
 * queued; the queue is pushed when the server can be reached. A push the
 * server *refuses* - as opposed to one that never arrives - is undone locally
 * and reported, because retrying it would never succeed.
 */

import { forgetLegacy, readLegacy } from '@/store/adopt-local';
import type { Changes, Entity, FamilyStore } from '@/store/family-store';
import { getItem, setItem } from '@/store/key-value';
import { createLocalStore } from '@/store/local-store';
import {
    createRemoteClient,
    StoreError,
    type RemoteCollection,
} from '@/store/remote-client';
import { createId } from '@/utils/id';

const OUTBOX_VERSION = 1;

/**
 * `before` is what the record looked like beforehand, and it is the whole of
 * how a refusal is undone. A create has none - undoing it is deleting the
 * record - which is why it is the one kind without the field.
 */
type Operation<T extends Entity> =
    | { kind: 'create'; id: string; record: T }
    | { kind: 'update'; id: string; changes: Changes<T>; before: T }
    | { kind: 'remove'; id: string; before: T };

export interface SyncedStore<T extends Entity> extends FamilyStore<T> {
    /**
     * A queued change the server refused and that has now been rolled back.
     * The write itself answered long ago, so this is the only way the message
     * reaches anyone.
     */
    onRefusal(listener: (message: string) => void): () => void;
}

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
    collection: RemoteCollection,
    legacy?: string
): SyncedStore<T> {
    const local = createLocalStore<T>(key);
    const remote = createRemoteClient<T>(collection);

    /** The largest `updatedAt` reconciled so far, kept beside the collection. */
    const mark = `${key}.since`;
    const outbox = `${key}.outbox`;

    const listeners = new Set<(message: string) => void>();
    const refuse = (message: string) =>
        listeners.forEach((listener) => listener(message));

    const readQueue = async (): Promise<Operation<T>[]> => {
        try {
            const raw = await getItem(outbox);
            if (!raw) return [];
            const stored = JSON.parse(raw);
            if (stored?.version !== OUTBOX_VERSION) return [];
            return Array.isArray(stored.operations) ? stored.operations : [];
        } catch {
            return [];
        }
    };

    const writeQueue = (operations: Operation<T>[]) =>
        setItem(
            outbox,
            JSON.stringify({ version: OUTBOX_VERSION, operations })
        );

    const enqueue = async (operation: Operation<T>) => {
        await writeQueue([...(await readQueue()), operation]);
    };

    const push = async (operation: Operation<T>): Promise<T | null> => {
        switch (operation.kind) {
            case 'create':
                return remote.create(operation.record);
            case 'update':
                return remote.update(operation.id, operation.changes);
            case 'remove':
                await remote.remove(operation.id);
                return null;
        }
    };

    /** What the record was before the refused change, back where it was. */
    const rollback = async (operation: Operation<T>) => {
        const current = await local.list();

        if (operation.kind === 'create') {
            await local.replace(
                current.filter((item) => item.id !== operation.id)
            );
            return;
        }

        const { before } = operation;
        await local.replace(
            current.some((item) => item.id === operation.id)
                ? current.map((item) =>
                      item.id === operation.id ? before : item
                  )
                : [...current, before]
        );
    };

    const settle = async (operation: Operation<T>, record: T) => {
        const current = await local.list();
        await local.replace(
            current.map((item) => (item.id === operation.id ? record : item))
        );
    };

    /**
     * The queue is re-read from storage on every turn rather than held across
     * the loop: a write made while this is running appends to it, and working
     * from a copy would write that operation back out of existence.
     */
    const drain = async () => {
        for (;;) {
            const queue = await readQueue();
            if (queue.length === 0) return;

            const [operation] = queue;

            try {
                const record = await push(operation);

                /**
                 * The server's answer carries the timestamps, so it replaces
                 * the optimistic record - unless something later in the queue
                 * has already changed it again, in which case that change is
                 * what the screen is showing and its own push will settle it.
                 */
                const superseded = queue
                    .slice(1)
                    .some((later) => later.id === operation.id);
                if (record && !superseded) await settle(operation, record);

                await writeQueue(queue.slice(1));
            } catch (failure) {
                /**
                 * Anything the server did not answer is a transport failure:
                 * the queue keeps its place and the next flush tries again.
                 */
                if (!(failure instanceof StoreError)) return;

                await rollback(operation);
                refuse(failure.message);

                /**
                 * Everything else queued for this record was built on a change
                 * that never happened, so it goes with it - otherwise undoing
                 * one of them would put the record back.
                 */
                const latest = await readQueue();
                await writeQueue(
                    latest.filter((other) => other.id !== operation.id)
                );
            }
        }
    };

    let flushing: Promise<void> | null = null;
    let again = false;

    /**
     * One drain at a time. A write that arrives while one is running asks for
     * another afterwards rather than being left in the queue until something
     * else happens to trigger a flush.
     */
    const flush = () => {
        if (flushing) {
            again = true;
            return flushing;
        }

        flushing = (async () => {
            do {
                again = false;
                await drain();
            } while (again);
        })()
            .catch(() => {})
            .finally(() => {
                flushing = null;
            });

        return flushing;
    };

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
        const latest = incoming.reduce(
            (newest, record) =>
                record.updatedAt && record.updatedAt > (newest ?? '')
                    ? record.updatedAt
                    : newest,
            since
        );
        if (latest) await setItem(mark, latest);
    };

    /**
     * Records an earlier version of the app left behind, taken into this
     * family as though they had just been made here. Their own ids are kept,
     * which is what makes it safe to run twice: a second attempt posts the
     * same ids and the routes answer with the records they already hold.
     *
     * The old key is dropped only once they are in the outbox, so a failure in
     * between leaves them to be read again rather than losing them.
     */
    const adopt = async () => {
        if (!legacy) return;

        const records = await readLegacy<T>(legacy);
        if (records.length > 0) {
            const current = await local.list();
            const held = new Set(current.map((item) => item.id));
            const fresh = records.filter((record) => !held.has(record.id));

            await local.replace([...current, ...fresh]);
            for (const record of fresh) {
                await enqueue({ kind: 'create', id: record.id, record });
            }
        }

        await forgetLegacy(legacy);
    };

    let pulled: Promise<void> | null = null;

    /**
     * Adoption first, then the queue, then the pull. Each has to precede the
     * next: adopted records are only in the outbox until it drains, and a full
     * pull replaces the collection outright, so pulling before either would
     * throw them away. A queue that would not drain means the server is
     * unreachable, so there is nothing to pull either.
     */
    const sync = () => {
        if (!pulled) {
            pulled = adopt()
                .then(flush)
                .then(async () => {
                    if ((await readQueue()).length === 0) await pull();
                })
                .catch(() => {
                    pulled = null;
                });
        }
        return pulled;
    };

    return {
        list() {
            return local.list();
        },

        /**
         * The id is minted here rather than by the server, so the record has
         * one from the moment it exists - which is what lets a create be
         * queued, retried and referred to by later changes before it has ever
         * been sent.
         */
        async create(input) {
            const record = { ...input, id: createId() } as T;
            await local.replace([...(await local.list()), record]);
            await enqueue({ kind: 'create', id: record.id, record });
            void flush();
            return record;
        },

        async update(id, changes) {
            const current = await local.list();
            const before = current.find((item) => item.id === id);
            if (!before) throw new Error(`No record with id ${id}`);

            const updated = { ...before, ...changes } as T;
            await local.replace(
                current.map((item) => (item.id === id ? updated : item))
            );
            await enqueue({ kind: 'update', id, changes, before });
            void flush();
            return updated;
        },

        async remove(id) {
            const current = await local.list();
            const before = current.find((item) => item.id === id);
            if (!before) return;

            await local.replace(current.filter((item) => item.id !== id));
            await enqueue({ kind: 'remove', id, before });
            void flush();
        },

        subscribe(listener) {
            const unsubscribe = local.subscribe(listener);
            void sync();
            return unsubscribe;
        },

        onRefusal(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
