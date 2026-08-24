import React, { createContext, useContext, useCallback } from 'react';

import { type ChoreItem } from '@/constants/mock-data';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { createLocalStore } from '@/store/local-store';

const store = createLocalStore<ChoreItem>('familist.chores');

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
    addChore: (label: string, day: string) => void;
    toggleChore: (id: string) => void;
    deleteChore: (id: string) => void;
    editChore: (id: string, newLabel: string) => void;
    toggleChoreActive: (label: string, day: string) => void;
    assignChore: (id: string, assigneeId: string | undefined) => void;
}

const ChoresContext = createContext<ChoresContextValue | null>(null);

export function ChoresProvider({ children }: { children: React.ReactNode }) {
    const { items: chores, loading } = useStoreCollection(store);

    const addChore = useCallback(async (label: string, day: string) => {
        await store.create({ label, done: false, day });
    }, []);

    const toggleChore = useCallback(async (id: string) => {
        const current = await store.list();
        const chore = current.find((item) => item.id === id);
        if (chore) {
            await store.update(id, { done: !chore.done });
        }
    }, []);

    const deleteChore = useCallback(async (id: string) => {
        await store.remove(id);
    }, []);

    const editChore = useCallback(async (id: string, newLabel: string) => {
        await store.update(id, { label: newLabel });
    }, []);

    const toggleChoreActive = useCallback(
        async (label: string, day: string) => {
            const current = await store.list();
            const matching = current.filter(
                (chore) => chore.label === label && chore.day === day
            );
            if (matching.length === 0) {
                await store.create({ label, done: false, day });
                return;
            }
            for (const chore of matching) {
                await store.remove(chore.id);
            }
        },
        []
    );

    const assignChore = useCallback(
        async (id: string, assigneeId: string | undefined) => {
            await store.update(id, { assigneeId });
        },
        []
    );

    return (
        <ChoresContext.Provider
            value={{
                chores,
                loading,
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
