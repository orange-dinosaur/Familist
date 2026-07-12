/**
 * Mock data for all screens.
 * Will be replaced with database reads in the future.
 */

import { SymbolViewProps } from 'expo-symbols';

// ─── Types ──────────────────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    initials: string;
    color: string;
}

export interface MealItem {
    name: string;
    time: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    emoji: string;
}

export interface ChoreItem {
    id: string;
    label: string;
    done: boolean;
    assigneeId?: string;
}

export interface TodoItem {
    id: string;
    label: string;
    done: boolean;
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
}

export interface SubscriptionItem {
    name: string;
    price: string;
    cycle: 'monthly' | 'yearly';
    icon: SymbolViewProps['name'];
}

export interface PaymentDeadline {
    name: string;
    dueDate: string;
    amount: string;
    isPaid: boolean;
}

export interface SharedLink {
    title: string;
    url: string;
    addedBy: string;
}

// ─── Mock Users ─────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
    { id: 'mom', name: 'Mom', initials: 'M', color: '#D81B60' },
    { id: 'dad', name: 'Dad', initials: 'D', color: '#1E88E5' },
    { id: 'giulio', name: 'Giulio', initials: 'G', color: '#43A047' },
    { id: 'sofia', name: 'Sofia', initials: 'S', color: '#FB8C00' },
];

// ─── Daily Meals ────────────────────────────────────────────────────────

export const dailyMeals: MealItem[] = [
    { name: 'Greek yogurt with granola', time: 'breakfast', emoji: '🥣' },
    { name: 'Pasta al pomodoro', time: 'lunch', emoji: '🍝' },
    { name: 'Fresh seasonal fruit', time: 'snack', emoji: '🍎' },
    { name: 'Grilled chicken salad', time: 'dinner', emoji: '🥗' },
];

/** Preview subset used on the home cards */
export const dailyMealPreview = dailyMeals.slice(0, 3).map((m) => m.name);

// ─── Daily Chores ───────────────────────────────────────────────────────

export const dailyChores: ChoreItem[] = [
    { id: '1', label: 'Clean kitchen', done: true, assigneeId: 'sofia' },
    { id: '2', label: 'Do laundry', done: false, assigneeId: 'mom' },
    { id: '3', label: 'Vacuum living room', done: false, assigneeId: 'dad' },
    { id: '4', label: 'Take out trash', done: true, assigneeId: 'giulio' },
    { id: '5', label: 'Water plants', done: false, assigneeId: 'giulio' },
];

export const dailyChoresPreview = dailyChores.slice(0, 3);

// ─── To-Do / Long-term ─────────────────────────────────────────────────

export const todoItems: TodoItem[] = [
    {
        id: 't1',
        label: 'Organize garage',
        done: false,
        priority: 'medium',
        assigneeId: 'dad',
    },
    {
        id: 't2',
        label: 'Paint bedroom walls',
        done: false,
        priority: 'high',
        assigneeId: 'mom',
    },
    {
        id: 't3',
        label: 'Fix leaky faucet',
        done: true,
        priority: 'high',
        assigneeId: 'dad',
    },
    {
        id: 't4',
        label: 'Buy new curtains',
        done: false,
        priority: 'low',
        assigneeId: 'sofia',
    },
    {
        id: 't5',
        label: 'Schedule dentist appointment',
        done: false,
        priority: 'medium',
        assigneeId: 'giulio',
    },
    { id: 't6', label: 'Clean out attic', done: false, priority: 'low' },
];

export const todoPreview = todoItems.filter((t) => !t.done).slice(0, 2);

// ─── Subscriptions ──────────────────────────────────────────────────────

export const subscriptions: SubscriptionItem[] = [
    {
        name: 'Netflix',
        price: '€15.99',
        cycle: 'monthly',
        icon: { ios: 'play.rectangle.fill', web: 'smart_display' },
    },
    {
        name: 'Spotify',
        price: '€9.99',
        cycle: 'monthly',
        icon: { ios: 'music.note', web: 'music_note' },
    },
    {
        name: 'iCloud+',
        price: '€2.99',
        cycle: 'monthly',
        icon: { ios: 'icloud.fill', web: 'cloud' },
    },
    {
        name: 'Gym membership',
        price: '€39.00',
        cycle: 'monthly',
        icon: { ios: 'figure.run', web: 'fitness_center' },
    },
    {
        name: 'Adobe Creative Cloud',
        price: '€59.99',
        cycle: 'monthly',
        icon: { ios: 'paintbrush.fill', web: 'brush' },
    },
];

// ─── Payment Deadlines ──────────────────────────────────────────────────

export const paymentDeadlines: PaymentDeadline[] = [
    {
        name: 'Electricity bill',
        dueDate: '2026-04-20',
        amount: '€87.50',
        isPaid: false,
    },
    {
        name: 'Internet bill',
        dueDate: '2026-04-25',
        amount: '€34.99',
        isPaid: false,
    },
    {
        name: 'Car insurance',
        dueDate: '2026-05-01',
        amount: '€145.00',
        isPaid: false,
    },
    {
        name: 'Water bill',
        dueDate: '2026-04-15',
        amount: '€42.30',
        isPaid: true,
    },
    {
        name: 'Rent',
        dueDate: '2026-05-01',
        amount: '€1,200.00',
        isPaid: false,
    },
];

// ─── Shared Links ───────────────────────────────────────────────────────

export const sharedLinks: SharedLink[] = [
    {
        title: 'IKEA KALLAX Shelf',
        url: 'https://ikea.com/kallax',
        addedBy: 'Giulio',
    },
    {
        title: 'Holiday house in Sardinia',
        url: 'https://airbnb.com/listing/12345',
        addedBy: 'Sara',
    },
    {
        title: 'Family photo album',
        url: 'https://photos.google.com/album/xyz',
        addedBy: 'Giulio',
    },
    {
        title: 'Kids school calendar',
        url: 'https://school.edu/calendar',
        addedBy: 'Sara',
    },
];
