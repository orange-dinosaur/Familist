import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type ChoreDefinition } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const CHORE_DEFINITIONS = {
    path: '/api/chore-definitions',
    one: 'choreDefinition',
    many: 'choreDefinitions',
};

interface ChoreDefinitionsContextValue {
    definitions: ChoreDefinition[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /**
     * The chore that was added, so the caller can plan it for a day straight
     * away, and null if it was not added at all.
     */
    addDefinition: (name: string) => Promise<ChoreDefinition | null>;
    renameDefinition: (id: string, name: string) => Promise<boolean>;
    deleteDefinition: (id: string) => Promise<boolean>;
}

const ChoreDefinitionsContext =
    createContext<ChoreDefinitionsContextValue | null>(null);

export function ChoreDefinitionsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { family, member, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<ChoreDefinition>(
                      `familist.chore-definitions.${familyId}`,
                      CHORE_DEFINITIONS
                  )
                : null,
        [familyId]
    );

    const { items: definitions, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    /**
     * The creator is stamped from the session server-side; it is sent as well
     * so that the record held locally names one too, and whoever added the
     * chore is offered the rename and delete on it without waiting for a pull.
     */
    const addDefinition = useCallback(
        async (name: string) => {
            let created: ChoreDefinition | null = null;

            const written = await write(
                'Could not add that chore.',
                async (store) => {
                    created = await store.create({
                        name,
                        createdBy: member?.id ?? null,
                    });
                }
            );

            return written ? created : null;
        },
        [write, member]
    );

    const renameDefinition = useCallback(
        (id: string, name: string) =>
            write('Could not save that chore.', (store) =>
                store.update(id, { name })
            ),
        [write]
    );

    /** The days it was planned on go with it, which the route sees to. */
    const deleteDefinition = useCallback(
        (id: string) =>
            write('Could not delete that chore.', (store) => store.remove(id)),
        [write]
    );

    return (
        <ChoreDefinitionsContext.Provider
            value={{
                definitions,
                loading: familyLoading || loading,
                error,
                clearError,
                addDefinition,
                renameDefinition,
                deleteDefinition,
            }}>
            {children}
        </ChoreDefinitionsContext.Provider>
    );
}

export function useChoreDefinitions(): ChoreDefinitionsContextValue {
    const context = useContext(ChoreDefinitionsContext);
    if (!context) {
        throw new Error(
            'useChoreDefinitions must be used within a ChoreDefinitionsProvider'
        );
    }
    return context;
}
