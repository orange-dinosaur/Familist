/**
 * The write half of a collection provider: run a write against the store, and
 * hold the reason the last one did not work.
 *
 * The error lives here rather than in each screen because a write can fail
 * after it has returned - a queued change the server later refuses - and there
 * is no call site left to answer by then. One channel carries both, so a
 * screen never has two places to look.
 */

import { useCallback, useState } from 'react';

import type { Entity, FamilyStore } from '@/store/family-store';
import { writeFailure } from '@/store/remote-client';

const NO_FAMILY = 'You are not in a family yet.';

export function useStoreWrites<T extends Entity>(store: FamilyStore<T> | null) {
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    /** Answers whether the write went through, for callers that branch on it. */
    const write = useCallback(
        async (
            fallback: string,
            run: (store: FamilyStore<T>) => Promise<unknown>
        ): Promise<boolean> => {
            if (!store) {
                setError(NO_FAMILY);
                return false;
            }

            try {
                await run(store);
                setError(null);
                return true;
            } catch (failure) {
                setError(writeFailure(failure, fallback));
                return false;
            }
        },
        [store]
    );

    return { error, clearError, write };
}
