/**
 * The order the links are shown in, what a row says about one under its title
 * when the family wrote no note, and how what was typed becomes an address.
 */

import { type SharedLinkItem } from '@/constants/types';

/** By title, which is the order the route reads them in. */
export function byTitle(a: SharedLinkItem, b: SharedLinkItem): number {
    return a.title.localeCompare(b.title);
}

/**
 * The host, so a row says where the link goes without showing the query
 * string. Anything `URL` cannot parse is shown as it was typed - the route
 * refuses those, so this only happens while one is being written.
 */
export function linkHost(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

/**
 * What was typed with `https://` in front of it, when what was typed carries
 * no scheme at all. People type and paste `example.com`, and refusing that
 * would be refusing the way a link is usually written down.
 */
export function withScheme(url: string): string {
    const trimmed = url.trim();
    if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}
