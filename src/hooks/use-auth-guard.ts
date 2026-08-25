/**
 * Keeps the signed-out screens and the tabs on the right side of the session.
 *
 * This is UX only. The real boundary is the session check inside each API
 * route, which a redirect here cannot substitute for.
 */

import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { authClient } from '@/auth/client';

export function useAuthGuard() {
    const { data: session, isPending } = authClient.useSession();
    const segments = useSegments();
    const router = useRouter();

    const inAuthGroup = segments[0] === '(auth)';

    useEffect(() => {
        /**
         * The session is read back asynchronously on both platforms, so acting
         * while it is still pending would send a signed-in user to the login
         * screen on every launch.
         */
        if (isPending) return;

        if (!session && !inAuthGroup) {
            router.replace('/login');
        } else if (session && inAuthGroup) {
            router.replace('/');
        }
    }, [isPending, session, inAuthGroup, router]);
}
