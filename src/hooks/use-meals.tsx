import React, { createContext, useContext, useCallback } from 'react';

import { type MealItem } from '@/constants/mock-data';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { createLocalStore } from '@/store/local-store';

const store = createLocalStore<MealItem>('familist.meals');

interface MealContextValue {
    meals: MealItem[];
    loading: boolean;
    addMeal: (meal: Omit<MealItem, 'id'>) => void;
    removeMeal: (id: string) => void;
}

const MealContext = createContext<MealContextValue | null>(null);

export function MealProvider({ children }: { children: React.ReactNode }) {
    const { items: meals, loading } = useStoreCollection(store);

    const addMeal = useCallback(async (meal: Omit<MealItem, 'id'>) => {
        await store.create(meal);
    }, []);

    const removeMeal = useCallback(async (id: string) => {
        await store.remove(id);
    }, []);

    return (
        <MealContext.Provider value={{ meals, loading, addMeal, removeMeal }}>
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
