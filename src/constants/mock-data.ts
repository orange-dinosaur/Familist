/**
 * The record types the screens share, and the date helpers they all use.
 *
 * The name is a leftover: this began as the template's fixtures and is now
 * only types and helpers, everything else having moved to the database.
 */

import { AndroidSymbol, SFSymbol } from 'expo-symbols';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PlatformSymbol {
    ios: SFSymbol;
    web: AndroidSymbol;
}

/** The day key is the calendar day on the device's clock, never UTC's. */
export function getRelativeDateString(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`; // YYYY-MM-DD
}

export function formatLocalDateString(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
    return `${weekday}, ${monthDay}`;
}

/**
 * "Today" as the device's language says it. Hermes does not always ship
 * `RelativeTimeFormat`, so English stands in where it is missing.
 */
function relativeToday(): string {
    if (typeof Intl.RelativeTimeFormat === 'undefined') return 'Today';
    const label = new Intl.RelativeTimeFormat(undefined, {
        numeric: 'auto',
    }).format(0, 'day');
    return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}

export const todayLabel = relativeToday();

export function formatShortDateString(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    ) {
        return todayLabel;
    }
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = date.toLocaleDateString(undefined, {
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
    day: string;
}
