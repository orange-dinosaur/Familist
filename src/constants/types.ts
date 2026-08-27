/**
 * The record types the screens, the hooks and the API routes share.
 */

import { AndroidSymbol, SFSymbol } from 'expo-symbols';

export interface PlatformSymbol {
    ios: SFSymbol;
    web: AndroidSymbol;
}

export interface MealItem {
    id: string;
    name: string;
    time: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    emoji: string;
    day: string;
}

/** One of the chores a family has saved, which its days are planned from. */
export interface ChoreDefinition {
    id: string;
    name: string;
    /** The member who added it, and null for one the family started with. */
    createdBy?: string | null;
}

export interface ChoreItem {
    id: string;
    /** The saved chore this day was planned from, and named after. */
    definitionId: string;
    done: boolean;
    /** False for a chore that is not planned for its day but keeps its state. */
    active: boolean;
    /** Null is how the server says nobody, and how it is told so. */
    assigneeId?: string | null;
    day: string;
}

export interface TodoItem {
    id: string;
    label: string;
    done: boolean;
    priority: 'low' | 'medium' | 'high';
    /** Null is how the server says nobody, and how it is told so. */
    assigneeId?: string | null;
    /** A due date, which a to-do need not have. Meals and chores must. */
    day: string | null;
}
