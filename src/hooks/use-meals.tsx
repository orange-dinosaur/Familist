import React, { createContext, useContext, useState, useCallback } from 'react';

import { dailyMeals, type MealItem } from '@/constants/mock-data';
import { createId } from '@/utils/id';

interface MealContextValue {
    meals: MealItem[];
    addMeal: (meal: Omit<MealItem, 'id'>) => void;
    removeMeal: (id: string) => void;
}

const MealContext = createContext<MealContextValue | null>(null);

export function MealProvider({ children }: { children: React.ReactNode }) {
    const [meals, setMeals] = useState<MealItem[]>(dailyMeals);

    const addMeal = useCallback((meal: Omit<MealItem, 'id'>) => {
        setMeals((prev) => [...prev, { ...meal, id: createId() }]);
    }, []);

    const removeMeal = useCallback((id: string) => {
        setMeals((prev) => prev.filter((meal) => meal.id !== id));
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
