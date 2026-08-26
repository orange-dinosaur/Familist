/**
 * A tick while the app is in front of someone, and nothing while it is not.
 *
 * This is what makes a screen left open show what the rest of the family has
 * done. Coming back to the app is already a reason to read; this is the reason
 * for a device that never went away.
 *
 * One timer serves every collection. Three stores each keeping their own would
 * tick at three offsets and trickle requests out continuously, where a shared
 * one sends them together and leaves the connection alone in between.
 */

import { AppState } from 'react-native';

const INTERVAL = 20_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const tick = () => listeners.forEach((listener) => listener());

const start = () => {
    if (timer === null && listeners.size > 0) {
        timer = setInterval(tick, INTERVAL);
    }
};

const stop = () => {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
};

/**
 * Registered once rather than per listener, and never removed: the module
 * outlives every store, and a family switch builds new ones.
 */
AppState.addEventListener('change', (state) => {
    if (state === 'active') start();
    else stop();
});

export function onHeartbeat(listener: () => void): () => void {
    listeners.add(listener);
    if (AppState.currentState === 'active') start();

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
    };
}
