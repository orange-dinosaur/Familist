import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type ChoreItem } from '@/constants/mock-data';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { createRemoteStore, writeFailure } from '@/store/remote-store';

const CHORES = { path: '/api/chores', one: 'chore', many: 'chores' };

const NO_FAMILY = 'You are not in a family yet.';

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
    /** Every write answers with the reason it did not work, or null. */
    addChore: (label: string, day: string) => Promise<string | null>;
    toggleChore: (id: string) => Promise<string | null>;
    deleteChore: (id: string) => Promise<string | null>;
    editChore: (id: string, newLabel: string) => Promise<string | null>;
    toggleChoreActive: (label: string, day: string) => Promise<string | null>;
    assignChore: (
        id: string,
        assigneeId: string | undefined
    ) => Promise<string | null>;
}

const ChoresContext = createContext<ChoresContextValue | null>(null);

export function ChoresProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () => (familyId ? createRemoteStore<ChoreItem>(CHORES) : null),
        [familyId]
    );

    const { items: chores, loading } = useStoreCollection(store);

    const addChore = useCallback(
        async (label: string, day: string) => {
            if (!store) return NO_FAMILY;
            try {
                await store.create({ label, done: false, active: true, day });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not add that chore.');
            }
        },
        [store]
    );

    const toggleChore = useCallback(
        async (id: string) => {
            if (!store) return NO_FAMILY;
            try {
                const current = await store.list();
                const chore = current.find((item) => item.id === id);
                if (chore) {
                    await store.update(id, { done: !chore.done });
                }
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not change that chore.');
            }
        },
        [store]
    );

    const deleteChore = useCallback(
        async (id: string) => {
            if (!store) return NO_FAMILY;
            try {
                await store.remove(id);
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not delete that chore.');
            }
        },
        [store]
    );

    const editChore = useCallback(
        async (id: string, newLabel: string) => {
            if (!store) return NO_FAMILY;
            try {
                await store.update(id, { label: newLabel });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not save that chore.');
            }
        },
        [store]
    );

    /**
     * Planning a label in or out of a day. Turning it off clears the flag
     * rather than deleting the row, so the chore comes back with its assignee
     * and its done state intact - and a day that is planned and unplanned
     * repeatedly leaves one row behind rather than a trail of tombstones.
     */
    const toggleChoreActive = useCallback(
        async (label: string, day: string) => {
            if (!store) return NO_FAMILY;
            try {
                const current = await store.list();
                const matching = current.filter(
                    (chore) => chore.label === label && chore.day === day
                );
                const active = matching.filter((chore) => chore.active);

                if (active.length > 0) {
                    for (const chore of active) {
                        await store.update(chore.id, { active: false });
                    }
                    return null;
                }

                /** The most recent of the label's dormant rows, if it has any. */
                const dormant = matching[matching.length - 1];
                if (dormant) {
                    await store.update(dormant.id, { active: true });
                    return null;
                }

                await store.create({ label, done: false, active: true, day });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not change that chore.');
            }
        },
        [store]
    );

    /**
     * Unassigning has to travel as an explicit null: `JSON.stringify` drops an
     * undefined value, and the route reads an empty body as nothing to change.
     */
    const assignChore = useCallback(
        async (id: string, assigneeId: string | undefined) => {
            if (!store) return NO_FAMILY;
            try {
                await store.update(id, { assigneeId: assigneeId ?? null });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not assign that chore.');
            }
        },
        [store]
    );

    return (
        <ChoresContext.Provider
            value={{
                chores,
                loading: familyLoading || loading,
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
