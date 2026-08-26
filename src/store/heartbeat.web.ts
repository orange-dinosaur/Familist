/**
 * A tick while the app is in front of someone, and nothing while it is not.
 *
 * This is what makes a screen left open show what the rest of the family has
 * done. Coming back to the tab is already a reason to read; this is the reason
 * for one that was never left.
 *
 * One timer serves every collection. Three stores each keeping their own would
 * tick at three offsets and trickle requests out continuously, where a shared
 * one sends them together and leaves the connection alone in between.
 */

const INTERVAL = 20_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const tick = () => listeners.forEach((listener) => listener());

/** A hidden tab has nobody to show anything to, and an offline one cannot read. */
const awake = () =>
    typeof window !== 'undefined' &&
    window.navigator?.onLine !== false &&
    window.document.visibilityState !== 'hidden';

const settle = () => {
    if (awake() && listeners.size > 0) {
        if (timer === null) timer = setInterval(tick, INTERVAL);
    } else if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
};

/**
 * Registered once rather than per listener, and never removed: the module
 * outlives every store, and a family switch builds new ones.
 */
if (typeof window !== 'undefined') {
    window.document.addEventListener('visibilitychange', settle);
    window.addEventListener('online', settle);
    window.addEventListener('offline', settle);
}

export function onHeartbeat(listener: () => void): () => void {
    listeners.add(listener);
    settle();

    return () => {
        listeners.delete(listener);
        settle();
    };
}
