import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/auth/client';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFamily } from '@/hooks/use-family';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';
import { clearLocalData } from '@/store/clear-local';

type Mode = 'family' | 'rename' | 'create' | 'join' | 'leave' | 'delete';

type Prompt = 'rename' | 'create' | 'join';
type Confirm = 'leave' | 'delete';

const PROMPT: Record<Prompt, string> = {
    rename: 'Family name',
    create: 'New family name',
    join: 'Invite code',
};

const CONFIRM: Record<Confirm, { title: string; body: string; act: string }> = {
    leave: {
        title: 'Leave this family?',
        body: 'You stop seeing its meals, chores and to-dos. Everything in it stays where it is for everyone else.',
        act: 'Leave',
    },
    delete: {
        title: 'Delete this family?',
        body: 'Its members, meals, chores and to-dos are deleted for good. There is no way to undo this.',
        act: 'Delete',
    },
};

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
    const {
        family,
        member,
        families,
        renameFamily,
        switchFamily,
        createFamily,
        joinFamily,
        leaveFamily,
        deleteFamily,
    } = useFamily();
    const { members } = useMembers();
    const { data: session } = authClient.useSession();
    const [accountOpen, setAccountOpen] = useState(false);
    const [familyOpen, setFamilyOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('family');
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);

    const isOwner = member?.role === 'owner';
    const others = families.filter((option) => option.id !== family?.id);

    /**
     * Placeholders cannot hold a role, so they are neither somebody to hand
     * the family to nor somebody who would lose access. An owner who is the
     * only account in the family therefore has nothing to leave *to*, and is
     * offered the delete instead.
     */
    const accounts = members.filter((one) => one.role !== null);
    const canDelete = isOwner && accounts.length <= 1;

    const openFamily = () => {
        setMode('family');
        setDraft('');
        setError(null);
        setFamilyOpen(true);
    };

    const start = (next: Mode) => {
        setDraft(next === 'rename' ? (family?.name ?? '') : '');
        setError(null);
        setMode(next);
    };

    /**
     * Both close the sheet on success. The guard takes over from there when
     * there is no family left to show.
     */
    const confirm = async () => {
        const message =
            mode === 'delete' ? await deleteFamily() : await leaveFamily();

        if (message) {
            setError(message);
            return;
        }
        setFamilyOpen(false);
    };

    /** Each face of the sheet runs one call and goes back if it worked. */
    const submit = async () => {
        const message =
            mode === 'rename'
                ? await renameFamily(draft)
                : mode === 'create'
                  ? await createFamily(draft)
                  : await joinFamily(draft);

        if (message) {
            setError(message);
            return;
        }
        setMode('family');
    };

    const switchTo = async (familyId: string) => {
        const message = await switchFamily(familyId);
        if (message) {
            setError(message);
            return;
        }
        setFamilyOpen(false);
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
                        {mode === 'leave' || mode === 'delete' ? (
                            <>
                                <View style={styles.identity}>
                                    <ThemedText type="subtitle">
                                        {CONFIRM[mode].title}
                                    </ThemedText>
                                    <ThemedText
                                        type="small"
                                        themeColor="textSecondary">
                                        {CONFIRM[mode].body}
                                    </ThemedText>
                                </View>
                                <View style={styles.actions}>
                                    <Pressable
                                        onPress={() => start('family')}
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
                                        onPress={confirm}
                                        accessibilityLabel={CONFIRM[mode].act}
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.action,
                                            {
                                                backgroundColor:
                                                    theme.destructive,
                                            },
                                            pressed && { opacity: 0.8 },
                                        ]}>
                                        <ThemedText
                                            type="default"
                                            style={styles.destructiveLabel}>
                                            {CONFIRM[mode].act}
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        ) : mode !== 'family' ? (
                            <>
                                <ThemedText type="subtitle">
                                    {PROMPT[mode]}
                                </ThemedText>
                                <TextInput
                                    value={draft}
                                    onChangeText={setDraft}
                                    autoFocus
                                    autoCapitalize={
                                        mode === 'join'
                                            ? 'characters'
                                            : 'sentences'
                                    }
                                    returnKeyType="done"
                                    onSubmitEditing={submit}
                                    accessibilityLabel={PROMPT[mode]}
                                    placeholder={PROMPT[mode]}
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
                                        onPress={() => start('family')}
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
                                        onPress={submit}
                                        disabled={!draft.trim()}
                                        accessibilityLabel="Confirm"
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.action,
                                            {
                                                backgroundColor: draft.trim()
                                                    ? theme.text
                                                    : theme.backgroundElement,
                                            },
                                            pressed && { opacity: 0.8 },
                                        ]}>
                                        <ThemedText
                                            type="default"
                                            style={{
                                                color: draft.trim()
                                                    ? theme.background
                                                    : theme.textSecondary,
                                            }}>
                                            {mode === 'join' ? 'Join' : 'Save'}
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
                                        onPress={() => start('rename')}
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

                                {others.length > 0 && (
                                    <>
                                        <ThemedText
                                            type="small"
                                            themeColor="textSecondary"
                                            style={styles.heading}>
                                            Switch to
                                        </ThemedText>
                                        {others.map((option) => (
                                            <Pressable
                                                key={option.id}
                                                onPress={() =>
                                                    switchTo(option.id)
                                                }
                                                accessibilityLabel={`Switch to ${option.name}`}
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
                                                        ios: 'house.fill',
                                                        web: 'home',
                                                    }}
                                                    tintColor={
                                                        theme.textSecondary
                                                    }
                                                    size={22}
                                                />
                                                <ThemedText type="default">
                                                    {option.name}
                                                </ThemedText>
                                            </Pressable>
                                        ))}
                                    </>
                                )}

                                <Pressable
                                    onPress={() =>
                                        start(canDelete ? 'delete' : 'leave')
                                    }
                                    accessibilityLabel={
                                        canDelete
                                            ? 'Delete this family'
                                            : 'Leave this family'
                                    }
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
                                        name={
                                            canDelete
                                                ? {
                                                      ios: 'trash',
                                                      web: 'delete',
                                                  }
                                                : {
                                                      ios: 'rectangle.portrait.and.arrow.right',
                                                      web: 'logout',
                                                  }
                                        }
                                        tintColor={theme.destructive}
                                        size={22}
                                    />
                                    <ThemedText
                                        type="default"
                                        style={{ color: theme.destructive }}>
                                        {canDelete
                                            ? 'Delete this family'
                                            : 'Leave this family'}
                                    </ThemedText>
                                </Pressable>

                                <View style={styles.actions}>
                                    <Pressable
                                        onPress={() => start('create')}
                                        accessibilityLabel="Create a family"
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.action,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                            },
                                            pressed && { opacity: 0.8 },
                                        ]}>
                                        <ThemedText type="small">
                                            Create a family
                                        </ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => start('join')}
                                        accessibilityLabel="Join with a code"
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.action,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                            },
                                            pressed && { opacity: 0.8 },
                                        ]}>
                                        <ThemedText type="small">
                                            Join with a code
                                        </ThemedText>
                                    </Pressable>
                                </View>
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
    heading: {
        marginTop: Spacing.one,
    },
    destructiveLabel: {
        color: '#ffffff',
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
