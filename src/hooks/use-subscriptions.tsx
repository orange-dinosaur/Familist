import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type SubscriptionItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const SUBSCRIPTIONS = {
    path: '/api/subscriptions',
    one: 'subscription',
    many: 'subscriptions',
};

/**
 * A subscription carries seven fields, so a write takes the whole record
 * rather than that many positional arguments.
 */
export type SubscriptionInput = Omit<SubscriptionItem, 'id'>;

interface SubscriptionsContextValue {
    subscriptions: SubscriptionItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addSubscription: (input: SubscriptionInput) => Promise<boolean>;
    editSubscription: (
        id: string,
        input: SubscriptionInput
    ) => Promise<boolean>;
    deleteSubscription: (id: string) => Promise<boolean>;
}

const SubscriptionsContext = createContext<SubscriptionsContextValue | null>(
    null
);

export function SubscriptionsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<SubscriptionItem>(
                      `familist.subscriptions.${familyId}`,
                      SUBSCRIPTIONS,
                      'familist.subscriptions'
                  )
                : null,
        [familyId]
    );

    const { items: subscriptions, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    const addSubscription = useCallback(
        (input: SubscriptionInput) =>
            write('Could not add that subscription.', (store) =>
                store.create({ ...input, payerId: input.payerId ?? null })
            ),
        [write]
    );

    const editSubscription = useCallback(
        (id: string, input: SubscriptionInput) =>
            write('Could not save that subscription.', (store) =>
                store.update(id, { ...input, payerId: input.payerId ?? null })
            ),
        [write]
    );

    const deleteSubscription = useCallback(
        (id: string) =>
            write('Could not delete that subscription.', (store) =>
                store.remove(id)
            ),
        [write]
    );

    return (
        <SubscriptionsContext.Provider
            value={{
                subscriptions,
                loading: familyLoading || loading,
                error,
                clearError,
                addSubscription,
                editSubscription,
                deleteSubscription,
            }}>
            {children}
        </SubscriptionsContext.Provider>
    );
}

export function useSubscriptions(): SubscriptionsContextValue {
    const context = useContext(SubscriptionsContext);
    if (!context) {
        throw new Error(
            'useSubscriptions must be used within a SubscriptionsProvider'
        );
    }
    return context;
}
