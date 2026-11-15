// Run with: TZ=America/Los_Angeles bun scripts/check-renewal-day.ts
// and again with TZ=Europe/Rome.
import assert from 'node:assert/strict';

import { nextRenewalAfter } from '../src/utils/payment';
import { type SubscriptionItem } from '../src/constants/types';

function chain(
    start: string,
    cycle: SubscriptionItem['cycle'],
    renewalDay: number | null,
    steps: number
): string[] {
    const days = [start];
    for (let i = 0; i < steps; i++) {
        days.push(nextRenewalAfter(days[days.length - 1], cycle, renewalDay));
    }
    return days;
}

assert.deepEqual(chain('2026-01-31', 'monthly', 31, 4), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
    '2026-04-30',
    '2026-05-31',
]);
assert.deepEqual(chain('2026-01-30', 'monthly', 30, 2), [
    '2026-01-30',
    '2026-02-28',
    '2026-03-30',
]);
assert.deepEqual(chain('2026-10-31', 'monthly', 31, 2), [
    '2026-10-31',
    '2026-11-30',
    '2026-12-31',
]);
assert.deepEqual(chain('2024-02-29', 'yearly', 29, 4), [
    '2024-02-29',
    '2025-02-28',
    '2026-02-28',
    '2027-02-28',
    '2028-02-29',
]);
assert.deepEqual(chain('2026-03-26', 'weekly', 26, 1), [
    '2026-03-26',
    '2026-04-02',
]);

// Without a recorded day the clamped date is what it carries on from.
assert.deepEqual(chain('2026-01-31', 'monthly', null, 2), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-28',
]);

console.log('ok');
