/**
 * Deleting the signed-in person's account, as its own modal.
 *
 * It is a modal of its own rather than a face of whatever opened it: this is
 * the one thing in the app that cannot be undone, and it should not be one
 * stray tap away from the row that opens it. Both the account menu and
 * Settings show that row, which is why the flow lives here rather than in
 * either of them.
 *
 * A refusal naming families this person is the last owner of is not an error
 * but a step: the handover face takes over until each one has somebody else.
 */

import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
    AccountHandover,
    type OwnedFamily,
} from '@/components/account-handover';
import { ThemedText } from '@/components/themed-text';
import { apiFetch, authClient } from '@/auth/client';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';
import { clearLocalData } from '@/store/clear-local';

interface DeleteAccountProps {
    visible: boolean;
    onClose: () => void;
}

/**
 * The device keeps the family's records so they can be read offline, so
 * signing out has to take them with it. The session goes first: what is left
 * of it afterwards cannot write anything back.
 */
export async function signOutAndClear(): Promise<void> {
    await authClient.signOut();
    await clearLocalData();
}

export function DeleteAccount({ visible, onClose }: DeleteAccountProps) {
    const theme = useTheme();
    const scheme = useColorScheme();
    const { refresh: refreshMembers } = useMembers();

    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    /** Named by a refused deletion: the families still waiting for an owner. */
    const [owned, setOwned] = useState<OwnedFamily[]>([]);

    const close = () => {
        setOwned([]);
        setError(null);
        onClose();
    };

    /**
     * The session outlives the row it belonged to, so signing out afterwards is
     * what actually returns the app to its signed-out state - and the device
     * is still holding the family's lists until they are cleared.
     */
    const deleteAccount = async () => {
        if (busy) return;
        setBusy(true);
        const res = await apiFetch('/api/account', { method: 'DELETE' });
        const body = await res.json().catch(() => null);
        setBusy(false);

        if (!res.ok) {
            /** Named families mean it can be put right without leaving here. */
            if (Array.isArray(body?.families) && body.families.length > 0) {
                setOwned(body.families);
                setError(null);
                return;
            }
            setError(body?.error ?? 'Could not delete your account.');
            return;
        }

        onClose();
        await signOutAndClear();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={close}>
            <BlurView
                intensity={40}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={[
                    styles.overlay,
                    { backgroundColor: `${theme.text}29` },
                ]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={close}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                />
                <View
                    style={[
                        styles.sheet,
                        { backgroundColor: theme.background },
                    ]}>
                    {owned.length > 0 ? (
                        <AccountHandover
                            families={owned}
                            onHandedOver={(family) => {
                                setOwned((rest) =>
                                    rest.filter((one) => one.id !== family.id)
                                );
                                /** The new owner's row is on screen behind this. */
                                void refreshMembers();
                            }}
                            onCancel={close}
                        />
                    ) : (
                        <>
                            <View style={styles.identity}>
                                <ThemedText type="heading">
                                    Delete your account?
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    You are signed out and cannot sign back in.
                                    A family nobody else has an account in goes
                                    with you, and everything in it. Where
                                    somebody else does, the family stays and
                                    anything assigned to you loses its assignee.
                                </ThemedText>
                            </View>

                            {error && (
                                <ThemedText
                                    type="small"
                                    style={{ color: theme.destructive }}>
                                    {error}
                                </ThemedText>
                            )}

                            <View style={styles.actions}>
                                <Pressable
                                    onPress={close}
                                    disabled={busy}
                                    accessibilityLabel="Cancel"
                                    accessibilityRole="button"
                                    style={({ pressed }) => [
                                        styles.action,
                                        {
                                            backgroundColor:
                                                theme.backgroundElement,
                                        },
                                        pressed && { opacity: 0.8 },
                                    ]}>
                                    <ThemedText type="default">
                                        Cancel
                                    </ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={deleteAccount}
                                    disabled={busy}
                                    accessibilityLabel="Delete my account"
                                    accessibilityRole="button"
                                    style={({ pressed }) => [
                                        styles.action,
                                        { backgroundColor: theme.destructive },
                                        pressed && { opacity: 0.8 },
                                    ]}>
                                    <ThemedText
                                        type="default"
                                        style={{ color: theme.background }}>
                                        Delete
                                    </ThemedText>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
    },
    sheet: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: Spacing.four,
        gap: Spacing.three,
    },
    identity: {
        gap: Spacing.one,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    action: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: Spacing.three,
    },
});
