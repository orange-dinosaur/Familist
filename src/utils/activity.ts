/**
 * The order the activities are shown in.
 */

import { type ActivityItem } from '@/constants/types';

/**
 * Longest ago first, so what has been left the longest is at the top. One
 * never done at all comes before any date, which is what "never" amounts to.
 */
export function byLastDone(a: ActivityItem, b: ActivityItem): number {
    if (!a.lastDoneOn) return b.lastDoneOn ? -1 : a.name.localeCompare(b.name);
    if (!b.lastDoneOn) return 1;
    if (a.lastDoneOn !== b.lastDoneOn)
        return a.lastDoneOn < b.lastDoneOn ? -1 : 1;
    return a.name.localeCompare(b.name);
}
