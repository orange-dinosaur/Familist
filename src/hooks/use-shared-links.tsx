import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type SharedLinkItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const SHARED_LINKS = {
    path: '/api/shared-links',
    one: 'sharedLink',
    many: 'sharedLinks',
};

/**
 * A write takes the whole record, the way the other Other collections do, minus
 * the day it was kept: that is the store's to stamp and nobody's to edit.
 */
export type SharedLinkInput = Omit<SharedLinkItem, 'id' | 'createdAt'>;

interface SharedLinksContextValue {
    sharedLinks: SharedLinkItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addSharedLink: (input: SharedLinkInput) => Promise<boolean>;
    editSharedLink: (id: string, input: SharedLinkInput) => Promise<boolean>;
    deleteSharedLink: (id: string) => Promise<boolean>;
}

const SharedLinksContext = createContext<SharedLinksContextValue | null>(null);

export function SharedLinksProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<SharedLinkItem>(
                      `familist.shared-links.${familyId}`,
                      SHARED_LINKS,
                      'familist.shared-links'
                  )
                : null,
        [familyId]
    );

    const { items: sharedLinks, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    const addSharedLink = useCallback(
        (input: SharedLinkInput) =>
            write('Could not add that link.', (store) =>
                store.create({
                    ...input,
                    createdBy: input.createdBy ?? null,
                    /** The server stamps its own, which sync then brings back. */
                    createdAt: new Date().toISOString(),
                })
            ),
        [write]
    );

    const editSharedLink = useCallback(
        (id: string, input: SharedLinkInput) =>
            write('Could not save that link.', (store) =>
                store.update(id, {
                    ...input,
                    createdBy: input.createdBy ?? null,
                })
            ),
        [write]
    );

    const deleteSharedLink = useCallback(
        (id: string) =>
            write('Could not delete that link.', (store) => store.remove(id)),
        [write]
    );

    return (
        <SharedLinksContext.Provider
            value={{
                sharedLinks,
                loading: familyLoading || loading,
                error,
                clearError,
                addSharedLink,
                editSharedLink,
                deleteSharedLink,
            }}>
            {children}
        </SharedLinksContext.Provider>
    );
}

export function useSharedLinks(): SharedLinksContextValue {
    const context = useContext(SharedLinksContext);
    if (!context) {
        throw new Error(
            'useSharedLinks must be used within a SharedLinksProvider'
        );
    }
    return context;
}
