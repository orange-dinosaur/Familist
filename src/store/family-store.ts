/**
 * Storage contract for a single collection of family records.
 *
 * Signatures are async so a remote provider can be dropped in without the
 * screens changing.
 */

export interface Entity {
    id: string;

    /**
     * Written by the server, never by a screen, which is why both are
     * optional: a record the client has just built has neither yet. A synced
     * store reconciles on them - `updatedAt` decides which of two versions of
     * a record wins, and `deletedAt` is how a deletion travels, since a row
     * that is simply absent from an incremental read is a row that did not
     * change.
     */
    updatedAt?: string;
    deletedAt?: string | null;
}

export type Changes<T extends Entity> = Partial<Omit<T, 'id'>>;

export interface FamilyStore<T extends Entity> {
    list(): Promise<T[]>;

    /** The store assigns the id. */
    create(input: Omit<T, 'id'>): Promise<T>;

    /** Rejects if no record has this id. */
    update(id: string, changes: Changes<T>): Promise<T>;

    /** Removing an id that is not present succeeds. */
    remove(id: string): Promise<void>;

    /**
     * Emits the whole collection once it is available, then again after every
     * change. Returns an unsubscribe function.
     */
    subscribe(listener: (items: T[]) => void): () => void;
}
