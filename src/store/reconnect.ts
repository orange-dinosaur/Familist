/**
 * When the app has a reason to believe it can reach the server again.
 *
 * On native there is no connectivity event without another dependency, so
 * coming back to the foreground stands in for it: that is when a queue left
 * behind by a write made on a train is worth trying again.
 */

import { AppState } from 'react-native';

export function onReconnect(listener: () => void): () => void {
    const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') listener();
    });

    return () => subscription.remove();
}
