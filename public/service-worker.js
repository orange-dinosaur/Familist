/**
 * Service worker for the web build.
 *
 * Deferred in phase 2 because every screen's state was in memory - there was
 * nothing to read offline, so caching the shell would only have produced an
 * app that opened to nothing. Since step 24 the collections live in local
 * storage, so an app that can start without a connection has something to
 * show.
 *
 * Nothing is precached. Expo decides the bundle's filenames at build time, so
 * a hand-written list of them would be wrong by the next deploy; what is here
 * is cached as it is asked for.
 */

const VERSION = 'v1';
const SHELL = `familist-shell-${VERSION}`;
const ASSETS = `familist-assets-${VERSION}`;
const OURS = [SHELL, ASSETS];

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names
                    .filter(
                        (name) =>
                            name.startsWith('familist-') && !OURS.includes(name)
                    )
                    .map((name) => caches.delete(name))
            );

            /**
             * There is deliberately no `skipWaiting`. A new worker takes over
             * only once the pages the old one was serving have gone, so the
             * caches deleted just above are never ones a live page is still
             * asking for chunks from.
             */
            await self.clients.claim();
        })()
    );
});

const isAsset = (url) =>
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|png|jpe?g|svg|ico|woff2?|ttf)$/.test(url.pathname);

/**
 * Worth keeping: our own, complete, and not the answer to a redirect. The
 * middleware bounces a signed-out visitor to `/login`, and a redirected
 * response replayed for a navigation is refused by the browser outright.
 */
const storable = (response) =>
    response.ok && response.type === 'basic' && !response.redirected;

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    /**
     * Never the API. Those answers are the family's data and the session's
     * state: a stale one would be wrong, and a kept one would outlive the sign
     * out that is supposed to remove it.
     */
    if (url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    /** Hashed filenames, so what is cached under one can never be stale. */
    if (isAsset(url)) event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (storable(response)) {
            const cache = await caches.open(SHELL);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (offline) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw offline;
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (storable(response)) {
        const cache = await caches.open(ASSETS);
        await cache.put(request, response.clone());
    }
    return response;
}
