import React, { createContext, useContext, useState, useCallback } from 'react';

import { dailyMeals, type MealItem } from '@/constants/mock-data';

interface MealContextValue {
    meals: MealItem[];
    addMeal: (meal: MealItem) => void;
    removeMeal: (index: number) => void;
}

const MealContext = createContext<MealContextValue | null>(null);

export function MealProvider({ children }: { children: React.ReactNode }) {
    const [meals, setMeals] = useState<MealItem[]>(dailyMeals);

    const addMeal = useCallback((meal: MealItem) => {
        setMeals((prev) => [...prev, meal]);
    }, []);

    const removeMeal = useCallback((index: number) => {
        setMeals((prev) => prev.filter((_, i) => i !== index));
    }, []);

    return (
        <MealContext.Provider value={{ meals, addMeal, removeMeal }}>
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
