import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type MealItem } from '@/constants/mock-data';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const MEALS = { path: '/api/meals', one: 'meal', many: 'meals' };

interface MealContextValue {
    meals: MealItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Both answer whether the write went through. */
    addMeal: (meal: Omit<MealItem, 'id'>) => Promise<boolean>;
    removeMeal: (id: string) => Promise<boolean>;
}

const MealContext = createContext<MealContextValue | null>(null);

export function MealProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    /**
     * One store per family, with the family id in the storage key. The cache
     * outlives the session now, so keying it by anything less would show one
     * family's records to the next.
     */
    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<MealItem>(
                      `familist.meals.${familyId}`,
                      MEALS
                  )
                : null,
        [familyId]
    );

    const { items: meals, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    const addMeal = useCallback(
        (meal: Omit<MealItem, 'id'>) =>
            write('Could not add that meal.', (store) => store.create(meal)),
        [write]
    );

    const removeMeal = useCallback(
        (id: string) =>
            write('Could not remove that meal.', (store) => store.remove(id)),
        [write]
    );

    return (
        <MealContext.Provider
            value={{
                meals,
                loading: familyLoading || loading,
                error,
                clearError,
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
