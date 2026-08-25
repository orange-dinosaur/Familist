/**
 * Display rules shared by the client and the API routes. The server derives
 * these when it creates an account-backed member, so the rule has to be the
 * same one the client applies to placeholders.
 */

import { type MemberColor } from '@/constants/theme';

export const MEMBER_COLORS: MemberColor[] = [
    'memberSage',
    'memberWalnut',
    'memberPlum',
    'memberSlate',
];

export type MemberRole = 'owner' | 'editor' | 'checker';

export const MEMBER_ROLES: MemberRole[] = ['owner', 'editor', 'checker'];

export function initialsOf(name: string): string {
    return name.trim().charAt(0).toUpperCase();
}
