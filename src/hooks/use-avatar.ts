/**
 * The signed-in person's profile picture: choosing one, and taking it away.
 *
 * The picture is resized here rather than sent as it comes off the camera
 * roll. A phone photo is several megabytes and is about to be shown in a 40px
 * circle, so everything past a small square is bytes nobody will ever see -
 * and the route refuses anything over 300KB anyway.
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { apiFetch } from '@/auth/client';

/** Twice the largest circle it is shown in, so it stays sharp on a dense screen. */
const SIZE = 256;

export function useAvatar(onChange: (image: string | null) => void) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const choose = useCallback(async () => {
        if (busy) return;
        setError(null);

        const picked = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
        });

        if (picked.canceled) return;

        setBusy(true);
        try {
            const rendered = await ImageManipulator.manipulate(
                picked.assets[0].uri
            )
                .resize({ width: SIZE, height: SIZE })
                .renderAsync();

            const { base64 } = await rendered.saveAsync({
                compress: 0.8,
                format: SaveFormat.JPEG,
                base64: true,
            });

            if (!base64) {
                setError('Could not read that picture.');
                return;
            }

            const res = await apiFetch('/api/avatar', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    data: base64,
                    contentType: 'image/jpeg',
                }),
            });
            const body = await res.json().catch(() => null);

            if (!res.ok) {
                setError(body?.error ?? 'Could not save that picture.');
                return;
            }

            onChange(body.image);
        } catch {
            setError('Could not save that picture.');
        } finally {
            setBusy(false);
        }
    }, [busy, onChange]);

    const remove = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        setError(null);

        const res = await apiFetch('/api/avatar', { method: 'DELETE' });
        setBusy(false);

        if (!res.ok) {
            setError('Could not remove that picture.');
            return;
        }

        onChange(null);
    }, [busy, onChange]);

    return { choose, remove, busy, error };
}
