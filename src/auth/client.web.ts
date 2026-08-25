/**
 * Better Auth client for web. The browser keeps the session cookie and the API
 * routes are same-origin, so neither storage nor a base URL is needed.
 */

import { createAuthClient } from 'better-auth/react';

/**
 * Where the verification link sends the browser once the token is accepted.
 * The link is opened in a browser already, so a path on the same origin is all
 * that is needed.
 */
export const verificationCallbackURL = '/';

export const authClient = createAuthClient();

/**
 * Calls an API route as the signed-in user. The routes are same-origin, so the
 * browser attaches the session cookie itself.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(path, init);
}
