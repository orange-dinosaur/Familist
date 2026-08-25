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
                await store.create({ label, done: false, day });
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
     * A label is active for a day when a row exists for it, so turning it off
     * deletes the rows rather than clearing a flag. That churns tombstones once
     * this syncs - `web-migration-plan.md` has it down as an `active` column to
     * add before step 24.
     */
    const toggleChoreActive = useCallback(
        async (label: string, day: string) => {
            if (!store) return NO_FAMILY;
            try {
                const current = await store.list();
                const matching = current.filter(
                    (chore) => chore.label === label && chore.day === day
                );
                if (matching.length === 0) {
                    await store.create({ label, done: false, day });
                    return null;
                }
                for (const chore of matching) {
                    await store.remove(chore.id);
                }
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
