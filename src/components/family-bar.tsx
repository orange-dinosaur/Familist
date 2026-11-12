import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DeleteAccount, signOutAndClear } from '@/components/delete-account';
import { FamilyMembers } from '@/components/family-members';
import { MemberAvatar } from '@/components/member-avatar';
import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/auth/client';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAvatar } from '@/hooks/use-avatar';
import { useFamily } from '@/hooks/use-family';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';

type Mode =
    | 'family'
    | 'members'
    | 'rename'
    | 'create'
    | 'join'
    | 'leave'
    | 'delete';

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

/** One line of the account menu, under the hairline that divides them. */
function MenuRow({
    label,
    accessibilityLabel,
    icon,
    onPress,
    tone = 'default',
    chevron = false,
    disabled = false,
}: {
    label: string;
    accessibilityLabel?: string;
    icon: { ios: SFSymbol; web: AndroidSymbol };
    onPress: () => void;
    tone?: 'default' | 'destructive';
    chevron?: boolean;
    disabled?: boolean;
}) {
    const theme = useTheme();
    const tint = disabled
        ? theme.textMuted
        : tone === 'destructive'
          ? theme.destructive
          : theme.textSecondary;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
                styles.menuRow,
                { borderTopColor: `${theme.text}17` },
                pressed && { opacity: 0.6 },
            ]}>
            <SymbolView name={icon} tintColor={tint} size={16} />
            <ThemedText
                type="small"
                themeColor={
                    disabled
                        ? 'textMuted'
                        : tone === 'destructive'
                          ? 'destructive'
                          : 'text'
                }
                style={styles.menuLabel}>
                {label}
            </ThemedText>
            {chevron && (
                <SymbolView
                    name={{ ios: 'chevron.right', web: 'chevron_right' }}
                    tintColor={tint}
                    size={12}
                />
            )}
        </Pressable>
    );
}

/** One line of the family sheet: an icon, a label, and a way further in. */
function SheetRow({
    label,
    icon,
    onPress,
    tone = 'default',
    chevron = true,
}: {
    label: string;
    icon: { ios: SFSymbol; web: AndroidSymbol };
    onPress: () => void;
    tone?: 'default' | 'destructive';
    chevron?: boolean;
}) {
    const theme = useTheme();
    const tint =
        tone === 'destructive' ? theme.destructive : theme.textSecondary;

    return (
        <Pressable
            onPress={onPress}
            accessibilityLabel={label}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.sheetRow,
                { borderBottomColor: `${theme.text}17` },
                pressed && { opacity: 0.6 },
            ]}>
            <SymbolView name={icon} tintColor={tint} size={20} />
            <ThemedText
                type="default"
                style={[
                    styles.sheetRowLabel,
                    tone === 'destructive' && { color: theme.destructive },
                ]}>
                {label}
            </ThemedText>
            {chevron && (
                <SymbolView
                    name={{ ios: 'chevron.right', web: 'chevron_right' }}
                    tintColor={theme.textSecondary}
                    size={12}
                />
            )}
        </Pressable>
    );
}

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
    const scheme = useColorScheme();
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
    const { members, setMyImage } = useMembers();
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const [accountOpen, setAccountOpen] = useState(false);
    const [familyOpen, setFamilyOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('family');
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    /** The input submits and so does the button; one call is enough. */
    const [busy, setBusy] = useState(false);
    /** The account sheet's own confirmation, which the family sheet's modes cannot hold. */
    const [deleting, setDeleting] = useState(false);

    const isOwner = member?.role === 'owner';
    /** The bar shows the signed-in person, who is one of the family's members. */
    const me = members.find((one) => one.id === member?.id) ?? null;

    const {
        choose,
        remove: removePicture,
        busy: avatarBusy,
        error: avatarError,
    } = useAvatar(setMyImage);
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
        if (busy) return;
        setBusy(true);
        const message =
            mode === 'delete' ? await deleteFamily() : await leaveFamily();
        setBusy(false);

        if (message) {
            setError(message);
            return;
        }
        setFamilyOpen(false);
    };

    /** Each face of the sheet runs one call and goes back if it worked. */
    const submit = async () => {
        if (busy) return;
        setBusy(true);
        const message =
            mode === 'rename'
                ? await renameFamily(draft)
                : mode === 'create'
                  ? await createFamily(draft)
                  : await joinFamily(draft);
        setBusy(false);

        if (message) {
            setError(message);
            return;
        }
        setMode('family');
    };

    const switchTo = async (familyId: string) => {
        if (busy) return;
        setBusy(true);
        const message = await switchFamily(familyId);
        setBusy(false);
        if (message) {
            setError(message);
            return;
        }
        setFamilyOpen(false);
    };

    const signOut = async () => {
        setAccountOpen(false);
        await signOutAndClear();
    };

    return (
        <>
            <View style={styles.bar}>
                <View style={styles.brand}>
                    {/*
                     * The mark is drawn twice, in inks for opposite grounds:
                     * the green one reads on the dark background, the light
                     * one on the cream.
                     */}
                    <Image
                        source={
                            scheme === 'dark'
                                ? require('@/assets/images/familist-mark-verde.svg')
                                : require('@/assets/images/familist-mark-chiaro.svg')
                        }
                        style={styles.mark}
                        contentFit="contain"
                        accessibilityLabel="FamiList"
                    />

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
                                name={{
                                    ios: 'chevron.down',
                                    web: 'expand_more',
                                }}
                                tintColor={theme.textSecondary}
                                size={14}
                            />
                        )}
                    </Pressable>
                </View>

                <Pressable
                    onPress={() => setAccountOpen(true)}
                    accessibilityLabel="Account"
                    accessibilityRole="button"
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                    <MemberAvatar
                        member={me}
                        size={34}
                        icon={{ ios: 'person.fill', web: 'person' }}
                    />
                </Pressable>
            </View>

            <Modal
                visible={familyOpen}
                transparent
                animationType="none"
                onRequestClose={() => setFamilyOpen(false)}>
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
                        onPress={() => setFamilyOpen(false)}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.sheet,
                            { backgroundColor: theme.background },
                        ]}>
                        {mode === 'members' ? (
                            <FamilyMembers onBack={() => start('family')} />
                        ) : mode === 'leave' || mode === 'delete' ? (
                            <>
                                <View style={styles.identity}>
                                    <ThemedText type="heading">
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
                                            style={{ color: theme.background }}>
                                            {CONFIRM[mode].act}
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        ) : mode !== 'family' ? (
                            <>
                                <ThemedText type="heading">
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
                                        disabled={!draft.trim() || busy}
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
                                    <ThemedText type="heading">
                                        {family?.name}
                                    </ThemedText>
                                    <ThemedText
                                        type="small"
                                        themeColor="textSecondary">
                                        {members.length === 1
                                            ? '1 member'
                                            : `${members.length} members`}
                                        {isOwner
                                            ? ' · you own this family'
                                            : ' · you are a member'}
                                    </ThemedText>
                                </View>

                                <View>
                                    <View
                                        style={[
                                            styles.sectionHeader,
                                            {
                                                borderTopColor: `${theme.text}29`,
                                            },
                                        ]}>
                                        <ThemedText type="label">
                                            This family
                                        </ThemedText>
                                    </View>

                                    <SheetRow
                                        label="Family members"
                                        icon={{
                                            ios: 'person.2.fill',
                                            web: 'group',
                                        }}
                                        onPress={() => start('members')}
                                    />

                                    {isOwner && (
                                        <SheetRow
                                            label="Rename family"
                                            icon={{
                                                ios: 'pencil',
                                                web: 'edit',
                                            }}
                                            onPress={() => start('rename')}
                                        />
                                    )}

                                    <SheetRow
                                        label={
                                            canDelete
                                                ? 'Delete this family'
                                                : 'Leave this family'
                                        }
                                        icon={
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
                                        tone="destructive"
                                        chevron={false}
                                        onPress={() =>
                                            start(
                                                canDelete ? 'delete' : 'leave'
                                            )
                                        }
                                    />
                                </View>

                                <View>
                                    <View
                                        style={[
                                            styles.sectionHeader,
                                            {
                                                borderTopColor: `${theme.text}29`,
                                            },
                                        ]}>
                                        <ThemedText type="label">
                                            Your families
                                        </ThemedText>
                                    </View>

                                    {others.map((option) => (
                                        <SheetRow
                                            key={option.id}
                                            label={option.name}
                                            icon={{
                                                ios: 'house.fill',
                                                web: 'home',
                                            }}
                                            chevron={false}
                                            onPress={() => switchTo(option.id)}
                                        />
                                    ))}

                                    <SheetRow
                                        label="Create a family"
                                        icon={{ ios: 'plus', web: 'add' }}
                                        onPress={() => start('create')}
                                    />

                                    <SheetRow
                                        label="Join with a code"
                                        icon={{ ios: 'key', web: 'key' }}
                                        onPress={() => start('join')}
                                    />
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
                </BlurView>
            </Modal>

            <Modal
                visible={accountOpen}
                transparent
                animationType="none"
                onRequestClose={() => setAccountOpen(false)}>
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
                        onPress={() => setAccountOpen(false)}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.menu,
                            {
                                backgroundColor: theme.backgroundElement,
                                shadowColor: theme.text,
                            },
                        ]}>
                        <View style={styles.menuIdentity}>
                            <MemberAvatar
                                member={me}
                                size={36}
                                icon={{ ios: 'person.fill', web: 'person' }}
                            />
                            <View style={styles.menuText}>
                                <ThemedText type="small" numberOfLines={1}>
                                    {me?.name ??
                                        session?.user.name ??
                                        'Account'}
                                </ThemedText>
                                {session?.user.email && (
                                    <ThemedText
                                        themeColor="textMuted"
                                        numberOfLines={1}
                                        style={styles.menuEmail}>
                                        {session.user.email}
                                    </ThemedText>
                                )}
                            </View>
                        </View>

                        {/* Only somebody with a member row has a picture to change. */}
                        {me && (
                            <MenuRow
                                label={
                                    me.image
                                        ? 'Change picture'
                                        : 'Add a picture'
                                }
                                icon={{ ios: 'photo', web: 'image' }}
                                disabled={avatarBusy}
                                onPress={choose}
                            />
                        )}

                        {me?.image && (
                            <MenuRow
                                label="Remove picture"
                                accessibilityLabel="Remove profile picture"
                                icon={{ ios: 'xmark.circle', web: 'cancel' }}
                                disabled={avatarBusy}
                                onPress={removePicture}
                            />
                        )}

                        {avatarError && (
                            <ThemedText
                                type="small"
                                style={[
                                    styles.menuError,
                                    { color: theme.destructive },
                                ]}>
                                {avatarError}
                            </ThemedText>
                        )}

                        <MenuRow
                            label="Settings"
                            icon={{ ios: 'gearshape', web: 'settings' }}
                            chevron
                            onPress={() => {
                                setAccountOpen(false);
                                router.navigate('/settings');
                            }}
                        />

                        <MenuRow
                            label="Sign out"
                            icon={{
                                ios: 'rectangle.portrait.and.arrow.right',
                                web: 'logout',
                            }}
                            onPress={signOut}
                        />

                        <MenuRow
                            label="Delete account"
                            icon={{ ios: 'trash', web: 'delete' }}
                            tone="destructive"
                            onPress={() => {
                                setError(null);
                                setDeleting(true);
                            }}
                        />
                    </View>
                </BlurView>
            </Modal>

            <DeleteAccount
                visible={deleting}
                onClose={() => setDeleting(false)}
            />
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
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        flexShrink: 1,
    },
    /** The mark's viewBox is square, so it sits in a square box. */
    mark: {
        width: 28,
        height: 28,
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
    sectionHeader: {
        borderTopWidth: 1,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.one,
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
    menu: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 18,
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
    },
    menuIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four,
    },
    menuText: {
        flex: 1,
        minWidth: 0,
        gap: Spacing.half,
    },
    menuEmail: {
        fontFamily: Fonts.sansMedium,
        fontSize: 11,
        lineHeight: 15,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four,
        borderTopWidth: 1,
    },
    menuLabel: {
        flex: 1,
    },
    menuError: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
    },
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
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    sheetRowLabel: {
        flex: 1,
        minWidth: 0,
    },
});
