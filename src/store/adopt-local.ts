/**
 * Reading what an earlier version of the app left on the device.
 *
 * Before step 23 every collection lived in `localStorage` under an unscoped
 * key, with no family behind it, and members were another of those keys rather
 * than rows the server knew about. Signing in now would strand all of it: the
 * store reads a key with the family id in it and never looks at the old one.
 * `SyncedStore` hands what is here to the family before its first pull.
 */

import { apiFetch } from '@/auth/client';
import type { Entity } from '@/store/family-store';
import { getItem, removeItem } from '@/store/key-value';
import { type Member } from '@/utils/member';

const MEMBERS_KEY = 'familist.members';

/** The collections whose records can still point at a legacy member. */
const CONTENT_KEYS = [
    'familist.meals',
    'familist.chores',
    'familist.todos',
] as const;

/** What `createLocalStore` wrote: the only shape worth reading back. */
interface Envelope {
    version: number;
    items: unknown[];
}

function envelopeItems(raw: string): Record<string, unknown>[] {
    const stored = JSON.parse(raw) as Envelope;
    if (stored?.version !== 1 || !Array.isArray(stored.items)) return [];

    return stored.items.filter(
        (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && 'id' in item
    );
}

/**
 * The members key outlives the collections that point at it: it can only be
 * forgotten once no legacy collection is left that could still need the map.
 */
async function forgetMembersIfDone(): Promise<void> {
    const remaining = await Promise.all(
        CONTENT_KEYS.map((key) => getItem(key))
    );
    if (remaining.every((value) => value === null)) {
        await removeItem(MEMBERS_KEY);
    }
}

export async function forgetLegacy(key: string): Promise<void> {
    await removeItem(key);
    await forgetMembersIfDone();
}

/**
 * Matched on the name, which is the only thing a legacy member and a real one
 * have in common - the old ids were minted on the device and mean nothing to
 * the server. Matching rather than always creating is also what makes this
 * safe to run twice, since `POST /api/members` mints its own id and will not
 * take one, so there is no id to repeat the way an adopted chore repeats its
 * own.
 *
 * It is the right answer as well as the convenient one: a family that has
 * already recreated its people on the server should have its old chores point
 * at those people, not at duplicates of them.
 */
const sameName = (name: string) => name.trim().toLowerCase();

async function createMember(
    name: string,
    color: unknown
): Promise<string | null> {
    const res = await apiFetch('/api/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, color }),
    });

    /**
     * A refusal is final - only an owner may add members, so an editor with
     * old data on their device simply cannot bring them - and the chore it
     * would have been assigned to is still worth having unassigned.
     */
    if (!res.ok) return null;

    const body = await res.json().catch(() => null);
    return typeof body?.member?.id === 'string' ? body.member.id : null;
}

async function mapMembers(): Promise<Map<string, string>> {
    const ids = new Map<string, string>();

    const raw = await getItem(MEMBERS_KEY);
    if (!raw) return ids;

    let legacy: Record<string, unknown>[];
    try {
        legacy = envelopeItems(raw);
    } catch {
        await removeItem(MEMBERS_KEY);
        return ids;
    }

    if (legacy.length === 0) {
        await forgetMembersIfDone();
        return ids;
    }

    const res = await apiFetch('/api/members');
    if (!res.ok) throw new Error('Could not read the family members');

    const body = await res.json();
    const existing: Member[] = body?.members ?? [];
    const byName = new Map(
        existing.map((member) => [sameName(member.name), member.id])
    );

    for (const member of legacy) {
        const name = typeof member.name === 'string' ? member.name : '';
        if (!name.trim()) continue;

        const match = byName.get(sameName(name));
        if (match) {
            ids.set(member.id as string, match);
            continue;
        }

        const created = await createMember(name, member.color);
        if (created) {
            byName.set(sameName(name), created);
            ids.set(member.id as string, created);
        }
    }

    await forgetMembersIfDone();
    return ids;
}

let mapping: Promise<Map<string, string>> | null = null;

/**
 * Old member id to new one, computed once for the run. All three collections
 * and the members provider wait on the same promise rather than racing to
 * create the same people. A failed attempt is not remembered, so the next
 * caller tries again.
 */
export function adoptMembers(): Promise<Map<string, string>> {
    if (!mapping) {
        mapping = mapMembers().catch((failure) => {
            mapping = null;
            throw failure;
        });
    }
    return mapping;
}

/**
 * An assignee travels through the map or not at all: an id with no counterpart
 * belongs to someone this family never had, and the routes refuse an assignee
 * that is not in the family - so a chore that kept it would be refused whole,
 * rolled back and reported, which is worse than one that arrives unassigned.
 *
 * The sync timestamps go, on the same grounds: these records have never been
 * near the server, whatever they say.
 */
function clean<T extends Entity>(
    record: Record<string, unknown>,
    assignees: Map<string, string>
): T {
    const { assigneeId, updatedAt, deletedAt, ...rest } = record;
    if (!('assigneeId' in record)) return rest as unknown as T;

    const mapped =
        typeof assigneeId === 'string'
            ? (assignees.get(assigneeId) ?? null)
            : null;
    return { ...rest, assigneeId: mapped } as unknown as T;
}

export async function readLegacy<T extends Entity>(
    key: string,
    assignees: Map<string, string>
): Promise<T[]> {
    try {
        const raw = await getItem(key);
        if (!raw) return [];
        return envelopeItems(raw).map((item) => clean<T>(item, assignees));
    } catch {
        /** Unreadable, and reading it again next time will not help. */
        return [];
    }
}
