/**
 * Keeps the signed-out screens, the onboarding screen and the tabs on the
 * right side of the session.
 *
 * This is UX only. The real boundary is the session check inside each API
 * route, which a redirect here cannot substitute for.
 */

import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { authClient } from '@/auth/client';
import { useFamily } from '@/hooks/use-family';

export function useAuthGuard() {
    const { data: session, isPending } = authClient.useSession();
    const { family, loading } = useFamily();
    const segments = useSegments();
    const router = useRouter();

    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    const inOnboarding = group === '(onboarding)';

    useEffect(() => {
        /**
         * The session is read back asynchronously on both platforms, so acting
         * while it is still pending would send a signed-in user to the login
         * screen on every launch.
         */
        if (isPending) return;

        if (!session) {
            if (!inAuthGroup) router.replace('/login');
            return;
        }

        /** Whether the account has a family is a second, separate answer. */
        if (loading) return;

        if (!family) {
            if (!inOnboarding) router.replace('/welcome');
            return;
        }

        if (inAuthGroup || inOnboarding) router.replace('/');
    }, [
        isPending,
        session,
        loading,
        family,
        inAuthGroup,
        inOnboarding,
        router,
    ]);
}
