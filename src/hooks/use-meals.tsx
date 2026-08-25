import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type MealItem } from '@/constants/mock-data';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { writeFailure } from '@/store/remote-client';
import { createRemoteStore } from '@/store/remote-store';

const MEALS = { path: '/api/meals', one: 'meal', many: 'meals' };

interface MealContextValue {
    meals: MealItem[];
    loading: boolean;
    /** Both answer with the reason it did not work, or null. */
    addMeal: (meal: Omit<MealItem, 'id'>) => Promise<string | null>;
    removeMeal: (id: string) => Promise<string | null>;
}

const MealContext = createContext<MealContextValue | null>(null);

export function MealProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    /**
     * One store per family, so signing out or joining somewhere else starts
     * from an empty cache rather than showing the previous family's records.
     */
    const store = useMemo(
        () => (familyId ? createRemoteStore<MealItem>(MEALS) : null),
        [familyId]
    );

    const { items: meals, loading } = useStoreCollection(store);

    const addMeal = useCallback(
        async (meal: Omit<MealItem, 'id'>) => {
            if (!store) return 'You are not in a family yet.';
            try {
                await store.create(meal);
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not add that meal.');
            }
        },
        [store]
    );

    const removeMeal = useCallback(
        async (id: string) => {
            if (!store) return 'You are not in a family yet.';
            try {
                await store.remove(id);
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not remove that meal.');
            }
        },
        [store]
    );

    return (
        <MealContext.Provider
            value={{
                meals,
                loading: familyLoading || loading,
                addMeal,
                removeMeal,
            }}>
            {children}
        </MealContext.Provider>
    );
}

export function useMeals(): MealContextValue {
    const context = useContext(MealContext);
    if (!context) {
        throw new Error('useMeals must be used within a MealProvider');
    }
    return context;
}
