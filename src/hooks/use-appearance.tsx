/**
 * What the app looks like, and who decides.
 *
 * The choice is the person's, not the family's, so it is not part of the
 * synced content. It lives in three places at once: the device cache, which is
 * the only copy that exists before a session does; this provider, which is
 * what the screens read; and the server, which is what makes it follow the
 * person onto another device.
 *
 * The cache is read first and the server reconciled against it afterwards, so
 * a cold start paints the right way with no flash of the wrong one, and so the
 * app still honours the choice with no network at all.
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useColorScheme as useDeviceScheme } from 'react-native';

import { apiFetch, authClient } from '@/auth/client';
import { APPEARANCES, type Appearance } from '@/constants/types';
import { getItem, setItem } from '@/store/key-value';

/** Under the `familist.` prefix, so signing out sweeps it up with the rest. */
const KEY = 'familist.appearance';

interface AppearanceContextValue {
    /** What was chosen, which may be to follow the device. */
    appearance: Appearance;
    /** What that resolves to once the device has had its say. */
    scheme: 'light' | 'dark';
    /** False until the cache has been read, so nothing paints the wrong way first. */
    ready: boolean;
    chooseAppearance: (next: Appearance) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function stored(value: string | null): Appearance | null {
    return APPEARANCES.includes(value as Appearance)
        ? (value as Appearance)
        : null;
}

export function AppearanceProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, isPending } = authClient.useSession();
    const device = useDeviceScheme();

    const [appearance, setAppearance] = useState<Appearance>('system');
    const [ready, setReady] = useState(false);

    const userId = session?.user.id ?? null;

    useEffect(() => {
        let active = true;

        getItem(KEY)
            .then((value) => {
                if (!active) return;
                const held = stored(value);
                if (held) setAppearance(held);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setReady(true);
            });

        return () => {
            active = false;
        };
    }, []);

    /**
     * The server is the tie-breaker once there is a session, because it is
     * where a choice made on another device is. A signed-out app keeps
     * whatever the cache held.
     */
    useEffect(() => {
        if (isPending || !userId) return;

        let active = true;

        apiFetch('/api/preferences')
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!active) return;
                const theirs = stored(body?.appearance ?? null);
                if (!theirs) return;
                setAppearance(theirs);
                setItem(KEY, theirs).catch(() => {});
            })
            .catch(() => {});

        return () => {
            active = false;
        };
    }, [userId, isPending]);

    /**
     * The cache is written before the server is told, so the choice survives a
     * restart whether or not the request lands. A failed request is left
     * alone: the next launch reconciles it.
     */
    const chooseAppearance = useCallback(async (next: Appearance) => {
        setAppearance(next);
        await setItem(KEY, next).catch(() => {});
        await apiFetch('/api/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appearance: next }),
        }).catch(() => {});
    }, []);

    const scheme =
        appearance === 'system'
            ? device === 'dark'
                ? 'dark'
                : 'light'
            : appearance;

    return (
        <AppearanceContext.Provider
            value={{ appearance, scheme, ready, chooseAppearance }}>
            {children}
        </AppearanceContext.Provider>
    );
}

export function useAppearance(): AppearanceContextValue {
    const value = useContext(AppearanceContext);
    if (!value) {
        throw new Error('useAppearance needs an AppearanceProvider above it');
    }
    return value;
}
