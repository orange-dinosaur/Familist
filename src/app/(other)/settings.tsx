/**
 * The signed-in person's own settings.
 *
 * It draws its own header rather than using `ScreenHeader`: this screen is
 * about a person rather than a collection, so it carries their avatar and
 * their email, its title is a heading rather than a screen title, and it is
 * reached from the account menu rather than from the Other hub, so the back
 * control says Back.
 */

import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccount, signOutAndClear } from '@/components/delete-account';
import { MemberAvatar } from '@/components/member-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authClient } from '@/auth/client';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { APPEARANCES, type Appearance } from '@/constants/types';
import { useAppearance } from '@/hooks/use-appearance';
import { useFamily } from '@/hooks/use-family';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';

const APPEARANCE_LABELS: Record<Appearance, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
};

export default function SettingsScreen() {
    const theme = useTheme();
    const router = useRouter();

    const { member } = useFamily();
    const { members } = useMembers();
    const { data: session } = authClient.useSession();
    const { appearance, chooseAppearance } = useAppearance();

    const [deleting, setDeleting] = useState(false);

    const me = members.find((one) => one.id === member?.id) ?? null;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <Pressable
                    onPress={() =>
                        router.canGoBack()
                            ? router.back()
                            : router.navigate('/')
                    }
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.back,
                        pressed && styles.pressed,
                    ]}>
                    <SymbolView
                        name={{ ios: 'chevron.left', web: 'chevron_left' }}
                        tintColor={theme.textSecondary}
                        size={16}
                    />
                    <ThemedText type="label" themeColor="textSecondary">
                        Back
                    </ThemedText>
                </Pressable>

                <View style={styles.face}>
                    <MemberAvatar member={me} size={46} />
                    <View style={styles.faceText}>
                        <ThemedText type="heading">Settings</ThemedText>
                        {session?.user.email && (
                            <ThemedText
                                type="small"
                                themeColor="textSecondary"
                                numberOfLines={1}
                                style={styles.email}>
                                {session.user.email}
                            </ThemedText>
                        )}
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}>
                    <View
                        style={[
                            styles.sectionHeader,
                            { borderTopColor: `${theme.text}29` },
                        ]}>
                        <ThemedText type="label">Preferences</ThemedText>
                    </View>

                    <View
                        style={[
                            styles.row,
                            { borderBottomColor: `${theme.text}17` },
                        ]}>
                        <ThemedText
                            type="labelSmall"
                            themeColor="textSecondary"
                            style={styles.rowLabel}>
                            Appearance
                        </ThemedText>

                        <View style={styles.choices}>
                            {APPEARANCES.map((option) => {
                                const chosen = option === appearance;

                                return (
                                    <Pressable
                                        key={option}
                                        onPress={() => chooseAppearance(option)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Appearance: ${APPEARANCE_LABELS[option]}`}
                                        accessibilityState={{
                                            selected: chosen,
                                        }}
                                        style={({ pressed }) => [
                                            styles.choice,
                                            chosen && {
                                                backgroundColor: theme.text,
                                            },
                                            pressed && styles.pressed,
                                        ]}>
                                        <ThemedText
                                            type={
                                                chosen ? 'smallBold' : 'small'
                                            }
                                            style={{
                                                color: chosen
                                                    ? theme.background
                                                    : theme.textSecondary,
                                            }}>
                                            {APPEARANCE_LABELS[option]}
                                        </ThemedText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.foot}>
                    <Pressable
                        onPress={signOutAndClear}
                        accessibilityLabel="Sign out"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.signOut,
                            { backgroundColor: theme.text },
                            pressed && styles.pressed,
                        ]}>
                        <ThemedText
                            type="smallBold"
                            style={{ color: theme.background }}>
                            Sign out
                        </ThemedText>
                    </Pressable>

                    <Pressable
                        onPress={() => setDeleting(true)}
                        accessibilityLabel="Delete account"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.delete,
                            pressed && styles.pressed,
                        ]}>
                        <ThemedText
                            type="label"
                            style={{ color: theme.destructive }}>
                            Delete account
                        </ThemedText>
                    </Pressable>
                </View>

                <DeleteAccount
                    visible={deleting}
                    onClose={() => setDeleting(false)}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
        maxWidth: MaxContentWidth,
    },
    back: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.two,
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.four,
    },
    pressed: {
        opacity: 0.6,
    },
    face: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingTop: Spacing.four,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    faceText: {
        flex: 1,
    },
    email: {
        marginTop: Spacing.one,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two,
        borderTopWidth: 1,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.one,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    rowLabel: {
        width: 82,
    },
    choices: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.two,
    },
    choice: {
        borderRadius: 999,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.one,
    },
    foot: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
    },
    signOut: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: Spacing.three,
    },
    delete: {
        alignItems: 'center',
        paddingTop: Spacing.four,
        paddingBottom: Spacing.two,
    },
});
