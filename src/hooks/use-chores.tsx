import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type ChoreItem } from '@/constants/mock-data';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const CHORES = { path: '/api/chores', one: 'chore', many: 'chores' };

export const PRESET_CHORES = [
    'Clean kitchen',
    'Do laundry',
    'Vacuum living room',
    'Take out trash',
    'Water plants',
    'Wash dishes',
    'Mop floors',
    'Walk the dog',
    'Dust shelves',
    'Cook dinner',
];

interface ChoresContextValue {
    chores: ChoreItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addChore: (label: string, day: string) => Promise<boolean>;
    toggleChore: (id: string) => Promise<boolean>;
    deleteChore: (id: string) => Promise<boolean>;
    editChore: (id: string, newLabel: string) => Promise<boolean>;
    toggleChoreActive: (label: string, day: string) => Promise<boolean>;
    assignChore: (
        id: string,
        assigneeId: string | undefined
    ) => Promise<boolean>;
}

const ChoresContext = createContext<ChoresContextValue | null>(null);

export function ChoresProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<ChoreItem>(
                      `familist.chores.${familyId}`,
                      CHORES
                  )
                : null,
        [familyId]
    );

    const { items: chores, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    const addChore = useCallback(
        (label: string, day: string) =>
            write('Could not add that chore.', (store) =>
                store.create({ label, done: false, active: true, day })
            ),
        [write]
    );

    const toggleChore = useCallback(
        (id: string) =>
            write('Could not change that chore.', async (store) => {
                const current = await store.list();
                const chore = current.find((item) => item.id === id);
                if (chore) await store.update(id, { done: !chore.done });
            }),
        [write]
    );

    const deleteChore = useCallback(
        (id: string) =>
            write('Could not delete that chore.', (store) => store.remove(id)),
        [write]
    );

    const editChore = useCallback(
        (id: string, newLabel: string) =>
            write('Could not save that chore.', (store) =>
                store.update(id, { label: newLabel })
            ),
        [write]
    );

    /**
     * Planning a label in or out of a day. Turning it off clears the flag
     * rather than deleting the row, so the chore comes back with its assignee
     * and its done state intact - and a day that is planned and unplanned
     * repeatedly leaves one row behind rather than a trail of tombstones.
     */
    const toggleChoreActive = useCallback(
        (label: string, day: string) =>
            write('Could not change that chore.', async (store) => {
                const current = await store.list();
                const matching = current.filter(
                    (chore) => chore.label === label && chore.day === day
                );
                const active = matching.filter((chore) => chore.active);

                if (active.length > 0) {
                    for (const chore of active) {
                        await store.update(chore.id, { active: false });
                    }
                    return;
                }

                /** The most recent of the label's dormant rows, if it has any. */
                const dormant = matching[matching.length - 1];
                if (dormant) {
                    await store.update(dormant.id, { active: true });
                    return;
                }

                await store.create({ label, done: false, active: true, day });
            }),
        [write]
    );

    /**
     * Unassigning has to travel as an explicit null: `JSON.stringify` drops an
     * undefined value, and the route reads an empty body as nothing to change.
     */
    const assignChore = useCallback(
        (id: string, assigneeId: string | undefined) =>
            write('Could not assign that chore.', (store) =>
                store.update(id, { assigneeId: assigneeId ?? null })
            ),
        [write]
    );

    return (
        <ChoresContext.Provider
            value={{
                chores,
                loading: familyLoading || loading,
                error,
                clearError,
                addChore,
                toggleChore,
                deleteChore,
                editChore,
                toggleChoreActive,
                assignChore,
            }}>
            {children}
        </ChoresContext.Provider>
    );
}

export function useChores(): ChoresContextValue {
    const context = useContext(ChoresContext);
    if (!context) {
        throw new Error('useChores must be used within a ChoresProvider');
    }
    return context;
}
