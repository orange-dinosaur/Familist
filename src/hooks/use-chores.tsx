import React, { createContext, useContext, useState, useCallback } from 'react';

import { dailyChores, type ChoreItem } from '@/constants/mock-data';

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
    addChore: (label: string, day: string) => void;
    toggleChore: (id: string) => void;
    deleteChore: (id: string) => void;
    editChore: (id: string, newLabel: string) => void;
    toggleChoreActive: (label: string, day: string) => void;
    assignChore: (id: string, assigneeId: string | undefined) => void;
}

const ChoresContext = createContext<ChoresContextValue | null>(null);

export function ChoresProvider({ children }: { children: React.ReactNode }) {
    const [chores, setChores] = useState<ChoreItem[]>(dailyChores);

    const addChore = useCallback((label: string, day: string) => {
        const newChore: ChoreItem = {
            id:
                Math.random().toString(36).substring(7) ||
                Date.now().toString(),
            label,
            done: false,
            day,
        };
        setChores((prev) => [...prev, newChore]);
    }, []);

    const toggleChore = useCallback((id: string) => {
        setChores((prev) =>
            prev.map((chore) =>
                chore.id === id ? { ...chore, done: !chore.done } : chore
            )
        );
    }, []);

    const deleteChore = useCallback((id: string) => {
        setChores((prev) => prev.filter((chore) => chore.id !== id));
    }, []);

    const editChore = useCallback((id: string, newLabel: string) => {
        setChores((prev) =>
            prev.map((chore) =>
                chore.id === id ? { ...chore, label: newLabel } : chore
            )
        );
    }, []);

    const toggleChoreActive = useCallback((label: string, day: string) => {
        setChores((prev) => {
            const exists = prev.find(
                (chore) => chore.label === label && chore.day === day
            );
            if (exists) {
                return prev.filter(
                    (chore) => !(chore.label === label && chore.day === day)
                );
            } else {
                const newChore: ChoreItem = {
                    id:
                        Math.random().toString(36).substring(7) ||
                        Date.now().toString(),
                    label,
                    done: false,
                    day,
                };
                return [...prev, newChore];
            }
        });
    }, []);

    const assignChore = useCallback(
        (id: string, assigneeId: string | undefined) => {
            setChores((prev) =>
                prev.map((chore) =>
                    chore.id === id ? { ...chore, assigneeId } : chore
                )
            );
        },
        []
    );

    return (
        <ChoresContext.Provider
            value={{
                chores,
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
