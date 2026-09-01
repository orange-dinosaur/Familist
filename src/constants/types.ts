/**
 * The record types the screens, the hooks and the API routes share.
 */

import { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { type Currency } from '@/constants/currencies';

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
    /** Set when it is ticked off and cleared when it is put back. */
    completedAt?: string | null;
    priority: 'low' | 'medium' | 'high';
    /** Null is how the server says nobody, and how it is told so. */
    assigneeId?: string | null;
    /** A due date, which a to-do need not have. Meals and chores must. */
    day: string | null;
}

/**
 * A recurring payment. `nextRenewal` is the only date it carries: the Payments
 * screen derives its upcoming row from it and moves it on by one cycle when
 * that row is ticked off.
 */
export interface SubscriptionItem {
    id: string;
    name: string;
    emoji: string;
    /** Minor units, so an amount is never held as a float. */
    amount: number;
    currency: Currency;
    cycle: 'weekly' | 'monthly' | 'yearly';
    nextRenewal: string;
    /** Null is how the server says nobody, and how it is told so. */
    payerId?: string | null;
}

/**
 * Something the family wants to know when they last did. Only the latest date
 * is kept, so `lastDoneOn` is the whole answer and null is "never".
 */
export interface ActivityItem {
    id: string;
    name: string;
    emoji: string;
    lastDoneOn: string | null;
}
