/**
 * Copying to the clipboard, wrapped in one place.
 *
 * `Clipboard` still ships in both react-native and react-native-web, so this
 * needs no extra dependency and no platform pair - but it is deprecated in
 * react-native core, and the replacement is a native module that would mean
 * rebuilding the dev client. Isolated here so that swap is one file.
 */

import { Clipboard } from 'react-native';

export function copyToClipboard(text: string): void {
    Clipboard.setString(text);
}
