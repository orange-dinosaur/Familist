import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/auth/client';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFamily } from '@/hooks/use-family';
import { useTheme } from '@/hooks/use-theme';
import { clearLocalData } from '@/store/clear-local';

/**
 * Which family you are in, and who you are signed in as. Sits above every
 * tab's own header.
 *
 * `NativeTabs` renders its own container, so there is nowhere above it for a
 * shared header to live. Each screen renders this instead, which costs a line
 * per screen and works the same on both platforms.
 */
export function FamilyBar() {
    const theme = useTheme();
    const { family } = useFamily();
    const { data: session } = authClient.useSession();
    const [accountOpen, setAccountOpen] = useState(false);

    /**
     * The device keeps the family's records so they can be read offline, so
     * signing out has to take them with it. The session goes first: what is
     * left of it afterwards cannot write anything back.
     */
    const signOut = async () => {
        setAccountOpen(false);
        await authClient.signOut();
        await clearLocalData();
    };

    return (
        <>
            <View style={styles.bar}>
                <ThemedText
                    type="default"
                    numberOfLines={1}
                    style={styles.family}>
                    {family?.name ?? ''}
                </ThemedText>

                <Pressable
                    onPress={() => setAccountOpen(true)}
                    accessibilityLabel="Account"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.avatar,
                        { backgroundColor: theme.backgroundSelected },
                        pressed && { opacity: 0.7 },
                    ]}>
                    <SymbolView
                        name={{ ios: 'person.fill', web: 'person' }}
                        tintColor={theme.textSecondary}
                        size={18}
                    />
                </Pressable>
            </View>

            <Modal
                visible={accountOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setAccountOpen(false)}>
                <View style={styles.overlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setAccountOpen(false)}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.sheet,
                            { backgroundColor: theme.background },
                        ]}>
                        <View style={styles.identity}>
                            <ThemedText type="subtitle">Account</ThemedText>
                            {session?.user.email && (
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    {session.user.email}
                                </ThemedText>
                            )}
                        </View>

                        <Pressable
                            onPress={signOut}
                            accessibilityLabel="Sign out"
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.row,
                                { backgroundColor: theme.backgroundElement },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'rectangle.portrait.and.arrow.right',
                                    web: 'logout',
                                }}
                                tintColor={theme.textSecondary}
                                size={22}
                            />
                            <ThemedText type="default">Sign out</ThemedText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two,
        width: '100%',
        maxWidth: MaxContentWidth,
        alignSelf: 'center',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.two,
    },
    family: {
        flexShrink: 1,
        fontWeight: '600',
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 14,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.three,
    },
});
