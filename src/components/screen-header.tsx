import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenHeaderProps {
    title: string;
    /** The line under the title: what the screen is showing right now. */
    subtitle?: string;
    /** The one number the screen is built around, with its caption. */
    figure?: { value: string; label: string };
}

/**
 * The header the screens outside the tabs draw for themselves, the way the tab
 * screens draw their own titles. The back control falls back to the hub
 * because these paths can be loaded straight from the address bar, where there
 * is no history to go back to.
 */
export function ScreenHeader({ title, subtitle, figure }: ScreenHeaderProps) {
    const theme = useTheme();
    const router = useRouter();

    return (
        <View>
            <Pressable
                onPress={() =>
                    router.canGoBack()
                        ? router.back()
                        : router.navigate('/other')
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
                    Other
                </ThemedText>
            </Pressable>

            <View style={styles.titleRow}>
                <View style={styles.titleBlock}>
                    <ThemedText type="title">{title}</ThemedText>
                    {subtitle && (
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {subtitle}
                        </ThemedText>
                    )}
                </View>

                {figure && (
                    <View style={styles.figure}>
                        <ThemedText type="figureLarge" themeColor="memberSage">
                            {figure.value}
                        </ThemedText>
                        <ThemedText
                            type="label"
                            themeColor="textMuted"
                            style={styles.figureLabel}>
                            {figure.label}
                        </ThemedText>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    titleBlock: {
        flex: 1,
    },
    subtitle: {
        marginTop: Spacing.two,
        fontSize: 13,
        lineHeight: 18,
    },
    figure: {
        alignItems: 'flex-end',
        paddingBottom: Spacing.half,
    },
    figureLabel: {
        marginTop: Spacing.half,
    },
});
