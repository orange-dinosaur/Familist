import React, { createContext, useContext, useState, useCallback } from 'react';

import { dailyChores, type ChoreItem } from '@/constants/mock-data';

interface ChoresContextValue {
    chores: ChoreItem[];
    addChore: (label: string) => void;
    toggleChore: (id: string) => void;
    deleteChore: (id: string) => void;
    editChore: (id: string, newLabel: string) => void;
}

const ChoresContext = createContext<ChoresContextValue | null>(null);

export function ChoresProvider({ children }: { children: React.ReactNode }) {
    const [chores, setChores] = useState<ChoreItem[]>(dailyChores);

    const addChore = useCallback((label: string) => {
        const newChore: ChoreItem = {
            id:
                Math.random().toString(36).substring(7) ||
                Date.now().toString(),
            label,
            done: false,
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

    return (
        <ChoresContext.Provider
            value={{ chores, addChore, toggleChore, deleteChore, editChore }}>
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
