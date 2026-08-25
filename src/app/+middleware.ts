/**
 * Server-side half of the route guard, web only.
 *
 * The HTML for every screen is pre-rendered at build time, so it knows nothing
 * about who is asking for it. Without this, a signed-out visitor receives the
 * app, and `useAuthGuard` only bounces them once the bundle has loaded and the
 * session has been read - long enough to see the screen they are not allowed
 * to be on. Redirecting here means the browser never receives that HTML.
 *
 * This is UX only, exactly like the client half: it asks whether a session
 * cookie is present, never whether it is valid. Validating would put a
 * database round trip on every page load, and would still not be a boundary -
 * that is the session check inside each API route.
 */

import { getSessionCookie } from 'better-auth/cookies';
import type { MiddlewareFunction, MiddlewareSettings } from 'expo-server';

const AUTH_SCREENS = ['/login', '/signup'];
const APP_SCREENS = [
    '/',
    '/todo',
    '/daily-meal',
    '/daily-chores',
    '/explore',
    '/welcome',
];

/**
 * Route groups stay in the URL as an optional segment, so `/(tabs)/todo` serves
 * the same screen as `/todo` and has to be matched as well.
 */
const GROUPED = /^\/\((?:tabs|auth|onboarding)\)\//;

export const unstable_settings: MiddlewareSettings = {
    matcher: {
        methods: ['GET'],
        patterns: [...AUTH_SCREENS, ...APP_SCREENS, GROUPED],
    },
};

const middleware: MiddlewareFunction = (request) => {
    const url = new URL(request.url);
    const pathname =
        url.pathname.replace(/^\/\((?:tabs|auth|onboarding)\)/, '') || '/';
    const onAuthScreen = AUTH_SCREENS.includes(pathname);
    const signedIn = getSessionCookie(request.headers) !== null;

    if (!signedIn && !onAuthScreen) {
        return Response.redirect(new URL('/login', url), 302);
    }

    if (signedIn && onAuthScreen) {
        return Response.redirect(new URL('/', url), 302);
    }
};

export default middleware;
