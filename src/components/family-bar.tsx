import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
    const router = useRouter();
    const { family, member, renameFamily } = useFamily();
    const { data: session } = authClient.useSession();
    const [accountOpen, setAccountOpen] = useState(false);
    const [familyOpen, setFamilyOpen] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const isOwner = member?.role === 'owner';

    const openFamily = () => {
        setName(family?.name ?? '');
        setRenaming(false);
        setError(null);
        setFamilyOpen(true);
    };

    const saveName = async () => {
        const message = await renameFamily(name);
        if (message) {
            setError(message);
            return;
        }
        setRenaming(false);
    };

    const goToMembers = () => {
        setFamilyOpen(false);
        router.navigate('/members');
    };

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
                <Pressable
                    onPress={openFamily}
                    disabled={!family}
                    accessibilityLabel={
                        family ? `Family ${family.name}` : 'Family'
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.familyButton,
                        pressed && { opacity: 0.7 },
                    ]}>
                    <ThemedText
                        type="default"
                        numberOfLines={1}
                        style={styles.family}>
                        {family?.name ?? ''}
                    </ThemedText>
                    {family && (
                        <SymbolView
                            name={{ ios: 'chevron.down', web: 'expand_more' }}
                            tintColor={theme.textSecondary}
                            size={14}
                        />
                    )}
                </Pressable>

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
                visible={familyOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setFamilyOpen(false)}>
                <View style={styles.overlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setFamilyOpen(false)}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.sheet,
                            { backgroundColor: theme.background },
                        ]}>
                        {renaming ? (
                            <>
                                <ThemedText type="subtitle">
                                    Family name
                                </ThemedText>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={saveName}
                                    accessibilityLabel="Family name"
                                    placeholder="Family name"
                                    placeholderTextColor={theme.textSecondary}
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor:
                                                theme.backgroundElement,
                                            color: theme.text,
                                        },
                                    ]}
                                />
                                <View style={styles.actions}>
                                    <Pressable
                                        onPress={() => setRenaming(false)}
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
                                        onPress={saveName}
                                        disabled={!name.trim()}
                                        accessibilityLabel="Save"
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.action,
                                            {
                                                backgroundColor: name.trim()
                                                    ? theme.text
                                                    : theme.backgroundElement,
                                            },
                                            pressed && { opacity: 0.8 },
                                        ]}>
                                        <ThemedText
                                            type="default"
                                            style={{
                                                color: name.trim()
                                                    ? theme.background
                                                    : theme.textSecondary,
                                            }}>
                                            Save
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.identity}>
                                    <ThemedText type="subtitle">
                                        {family?.name}
                                    </ThemedText>
                                    <ThemedText
                                        type="small"
                                        themeColor="textSecondary">
                                        {isOwner
                                            ? 'You own this family'
                                            : 'You are a member of this family'}
                                    </ThemedText>
                                </View>

                                <Pressable
                                    onPress={goToMembers}
                                    accessibilityLabel="Family members"
                                    accessibilityRole="button"
                                    style={({ pressed }) => [
                                        styles.row,
                                        {
                                            backgroundColor:
                                                theme.backgroundElement,
                                        },
                                        pressed && {
                                            backgroundColor:
                                                theme.backgroundSelected,
                                        },
                                    ]}>
                                    <SymbolView
                                        name={{
                                            ios: 'person.2.fill',
                                            web: 'group',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={22}
                                    />
                                    <ThemedText type="default">
                                        Family members
                                    </ThemedText>
                                </Pressable>

                                {isOwner && (
                                    <Pressable
                                        onPress={() => setRenaming(true)}
                                        accessibilityLabel="Rename family"
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.row,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                            },
                                            pressed && {
                                                backgroundColor:
                                                    theme.backgroundSelected,
                                            },
                                        ]}>
                                        <SymbolView
                                            name={{
                                                ios: 'pencil',
                                                web: 'edit',
                                            }}
                                            tintColor={theme.textSecondary}
                                            size={22}
                                        />
                                        <ThemedText type="default">
                                            Rename family
                                        </ThemedText>
                                    </Pressable>
                                )}
                            </>
                        )}

                        {error && (
                            <ThemedText
                                type="small"
                                style={{ color: theme.destructive }}>
                                {error}
                            </ThemedText>
                        )}
                    </View>
                </View>
            </Modal>

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
    familyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        flexShrink: 1,
    },
    family: {
        flexShrink: 1,
        fontWeight: '600',
    },
    input: {
        borderRadius: 14,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        fontSize: 16,
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
