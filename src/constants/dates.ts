/**
 * The calendar-day helpers the day-keyed screens share. A day is a
 * `YYYY-MM-DD` string on the device's clock, matching the `date` columns.
 */

/** The day key is the calendar day on the device's clock, never UTC's. */
export function formatDateString(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`; // YYYY-MM-DD
}

export function getRelativeDateString(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return formatDateString(d);
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

/** Whole days from today to `dateStr`, on the device's clock. */
export function daysUntil(dateStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * How far off a day is, in the device's language. Like `relativeToday`, this
 * falls back to English where Hermes ships no `RelativeTimeFormat`.
 */
export function formatDaysUntil(dateStr: string): string {
    const days = daysUntil(dateStr);

    if (typeof Intl.RelativeTimeFormat === 'undefined') {
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        if (days === -1) return 'Yesterday';
        return days > 0 ? `In ${days} days` : `${-days} days ago`;
    }

    const label = new Intl.RelativeTimeFormat(undefined, {
        numeric: 'auto',
    }).format(days, 'day');
    return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}
