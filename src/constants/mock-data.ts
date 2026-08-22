/**
 * Mock data for all screens.
 * Will be replaced with database reads in the future.
 */

import { AndroidSymbol, SFSymbol } from 'expo-symbols';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PlatformSymbol {
    ios: SFSymbol;
    web: AndroidSymbol;
}

export interface User {
    id: string;
    name: string;
    initials: string;
    color: string;
}

export const DAYS_OF_WEEK = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

export function getRelativeDateString(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function formatLocalDateString(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
    return `${weekday}, ${monthDay}`;
}

export function formatShortDateString(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    ) {
        return 'Today';
    }
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
    return `${weekday}, ${monthDay}`;
}

export function getDateRange(): string[] {
    const range: string[] = [];
    for (let i = -5; i <= 7; i++) {
        range.push(getRelativeDateString(i));
    }
    return range;
}

export interface MealItem {
    name: string;
    time: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    emoji: string;
    day: string;
}

export interface ChoreItem {
    id: string;
    label: string;
    done: boolean;
    assigneeId?: string;
    day: string;
}

export interface TodoItem {
    id: string;
    label: string;
    done: boolean;
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    day: string;
}

export interface SubscriptionItem {
    name: string;
    price: string;
    cycle: 'monthly' | 'yearly';
    icon: PlatformSymbol;
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
    {
        name: 'Greek yogurt with granola',
        time: 'breakfast',
        emoji: '🥣',
        day: getRelativeDateString(0),
    },
    {
        name: 'Pasta al pomodoro',
        time: 'lunch',
        emoji: '🍝',
        day: getRelativeDateString(0),
    },
    {
        name: 'Fresh seasonal fruit',
        time: 'snack',
        emoji: '🍎',
        day: getRelativeDateString(1),
    },
    {
        name: 'Grilled chicken salad',
        time: 'dinner',
        emoji: '🥗',
        day: getRelativeDateString(0),
    },
    {
        name: 'Margherita Pizza',
        time: 'dinner',
        emoji: '🍕',
        day: getRelativeDateString(2),
    },
];

/** Preview subset used on the home cards */
export const dailyMealPreview = dailyMeals.slice(0, 3).map((m) => m.name);

// ─── Daily Chores ───────────────────────────────────────────────────────

export const dailyChores: ChoreItem[] = [
    {
        id: '1',
        label: 'Clean kitchen',
        done: true,
        assigneeId: 'sofia',
        day: getRelativeDateString(0),
    },
    {
        id: '2',
        label: 'Do laundry',
        done: false,
        assigneeId: 'mom',
        day: getRelativeDateString(1),
    },
    {
        id: '3',
        label: 'Vacuum living room',
        done: false,
        assigneeId: 'dad',
        day: getRelativeDateString(0),
    },
    {
        id: '4',
        label: 'Take out trash',
        done: true,
        assigneeId: 'giulio',
        day: getRelativeDateString(0),
    },
    {
        id: '5',
        label: 'Water plants',
        done: false,
        assigneeId: 'giulio',
        day: getRelativeDateString(-2),
    },
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
        day: getRelativeDateString(0),
    },
    {
        id: 't2',
        label: 'Paint bedroom walls',
        done: false,
        priority: 'high',
        assigneeId: 'mom',
        day: getRelativeDateString(1),
    },
    {
        id: 't3',
        label: 'Fix leaky faucet',
        done: true,
        priority: 'high',
        assigneeId: 'dad',
        day: getRelativeDateString(0),
    },
    {
        id: 't4',
        label: 'Buy new curtains',
        done: false,
        priority: 'low',
        assigneeId: 'sofia',
        day: getRelativeDateString(3),
    },
    {
        id: 't5',
        label: 'Schedule dentist appointment',
        done: false,
        priority: 'medium',
        assigneeId: 'giulio',
        day: getRelativeDateString(0),
    },
    {
        id: 't6',
        label: 'Clean out attic',
        done: false,
        priority: 'low',
        day: getRelativeDateString(-4),
    },
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
