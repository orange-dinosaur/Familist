/**
 * Storage contract for a single collection of family records.
 *
 * Signatures are async so a remote provider can be dropped in without the
 * screens changing.
 */

export interface Entity {
    id: string;
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
