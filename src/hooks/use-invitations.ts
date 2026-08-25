import { useCallback } from 'react';

import { apiFetch } from '@/auth/client';
import { type MemberRole } from '@/utils/member';

export interface Invitation {
    code: string;
    expiresAt: string;
}

/**
 * Creating an invitation. There is no state to hold: a code is handed to the
 * caller once and never read back, so this is a plain hook rather than another
 * provider around the app.
 */
export function useInvitations() {
    const createInvitation = useCallback(
        async (
            role: MemberRole,
            familyMemberId?: string
        ): Promise<Invitation | { error: string }> => {
            const res = await apiFetch('/api/invitations', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ role, familyMemberId }),
            });
            const body = await res.json().catch(() => null);

            if (!res.ok) {
                return { error: body?.error ?? 'Could not create an invite.' };
            }

            return { code: body.code, expiresAt: body.expiresAt };
        },
        []
    );

    return { createInvitation };
}
