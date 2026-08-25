/**
 * Platform key/value storage backing the local store.
 *
 * `localStorage` is absent while the export is rendered on the server and
 * throws outright when the browser has site data disabled.
 */

function storage(): Storage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

export async function getItem(key: string): Promise<string | null> {
    return storage()?.getItem(key) ?? null;
}

export async function setItem(key: string, value: string): Promise<void> {
    storage()?.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
    storage()?.removeItem(key);
}

export async function keys(): Promise<string[]> {
    const store = storage();
    if (!store) return [];

    const found: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (key !== null) found.push(key);
    }
    return found;
}
