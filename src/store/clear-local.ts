/**
 * Removing everything the app has kept on the device.
 *
 * Local storage is the read path, so a device that has signed out is still
 * holding the family's meals, chores and to-dos, the mark saying how far it
 * has reconciled, and any writes that never reached the server. Signing out
 * has to take all of it, or the next person to use the machine can read it.
 */

import { keys, removeItem } from '@/store/key-value';

/**
 * Everything this app writes is namespaced, which is what makes clearing it a
 * matter of the prefix rather than a list that would go stale the moment a
 * collection is added.
 */
const PREFIX = 'familist.';

export async function clearLocalData(): Promise<void> {
    const stored = await keys();
    await Promise.all(
        stored
            .filter((key) => key.startsWith(PREFIX))
            .map((key) => removeItem(key))
    );
}
