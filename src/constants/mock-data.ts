/**
 * Mock data for all screens.
 * Will be replaced with database reads in the future.
 */

import { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { MemberColor } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PlatformSymbol {
    ios: SFSymbol;
    web: AndroidSymbol;
}

export interface User {
    id: string;
    name: string;
    initials: string;
    color: MemberColor;
}

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
    id: string;
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
    { id: 'mom', name: 'Mom', initials: 'M', color: 'memberPlum' },
    { id: 'dad', name: 'Dad', initials: 'D', color: 'memberSlate' },
    { id: 'giulio', name: 'Giulio', initials: 'G', color: 'memberSage' },
    { id: 'sofia', name: 'Sofia', initials: 'S', color: 'memberWalnut' },
];

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
