/**
 * When the app has a reason to believe it can reach the server again.
 *
 * The browser says so outright, and a tab returning to the foreground is worth
 * treating the same way: `online` does not fire for a connection that dropped
 * and came back while the tab was hidden.
 */

export function onReconnect(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const wake = () => {
        const offline = window.navigator?.onLine === false;
        const hidden = window.document.visibilityState === 'hidden';
        if (!offline && !hidden) listener();
    };

    window.addEventListener('online', wake);
    window.document.addEventListener('visibilitychange', wake);

    return () => {
        window.removeEventListener('online', wake);
        window.document.removeEventListener('visibilitychange', wake);
    };
}
