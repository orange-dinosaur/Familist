/**
 * Better Auth client for native. There is no cookie jar here, so the session
 * is kept in SecureStore by the Expo plugin.
 */

import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

/**
 * Native has no origin to fall back on, so the API routes have to be addressed
 * absolutely. In development the Expo dev server hosts them, which is the host
 * the app was loaded from; a release build reads the deployed origin from the
 * environment.
 */
const baseURL =
    process.env.EXPO_PUBLIC_AUTH_URL ??
    (Constants.expoConfig?.hostUri
        ? `http://${Constants.expoConfig.hostUri}`
        : undefined);

/**
 * Where the verification link sends the browser once the token is accepted.
 * The mail is opened outside the app, so this has to be a deep link back into
 * it rather than a path.
 */
export const verificationCallbackURL = Linking.createURL('/');

export const authClient = createAuthClient({
    baseURL,
    plugins: [
        expoClient({
            scheme: 'familist',
            storagePrefix: 'familist',
            storage: SecureStore,
        }),
    ],
});

/**
 * Calls an API route as the signed-in user. Native has no cookie jar, so the
 * session cookie the Expo plugin stored has to be attached by hand.
 */
/**
 * An API path as something that can be fetched or shown. The routes store
 * paths rather than absolute URLs, which native cannot load on its own.
 */
export function apiUrl(path: string): string {
    return `${baseURL ?? ''}${path}`;
}

export async function apiFetch(
    path: string,
    init?: RequestInit
): Promise<Response> {
    const cookie = await authClient.getCookie();
    return fetch(apiUrl(path), {
        ...init,
        headers: { ...init?.headers, cookie },
    });
}
