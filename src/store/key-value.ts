/**
 * Platform key/value storage backing the local store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
}
