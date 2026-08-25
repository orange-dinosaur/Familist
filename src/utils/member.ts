/**
 * Display rules shared by the client and the API routes. The server derives
 * these when it creates an account-backed member, so the rule has to be the
 * same one the client applies to placeholders.
 */

import { type MemberColor } from '@/constants/theme';

/**
 * A person in the family, of either kind. `role` is also the answer to whether
 * they have an account: the server keeps `user_id` and `role` null or set
 * together, and only ever sends the role.
 */
export interface Member {
    id: string;
    name: string;
    initials: string;
    color: MemberColor;
    role: MemberRole | null;
}

export const MEMBER_COLORS: MemberColor[] = [
    'memberSage',
    'memberWalnut',
    'memberPlum',
    'memberSlate',
];

export type MemberRole = 'owner' | 'editor' | 'checker';

export const MEMBER_ROLES: MemberRole[] = ['owner', 'editor', 'checker'];

/** Long enough for a full name, short enough to render in a row. */
export const MAX_MEMBER_NAME_LENGTH = 60;

export function initialsOf(name: string): string {
    return name.trim().charAt(0).toUpperCase();
}
