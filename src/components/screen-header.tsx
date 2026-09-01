import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The header the screens outside the tabs draw for themselves, the way the tab
 * screens draw their own titles. The back control falls back to the hub
 * because these paths can be loaded straight from the address bar, where there
 * is no history to go back to.
 */
export function ScreenHeader({ title }: { title: string }) {
    const theme = useTheme();
    const router = useRouter();

    return (
        <View style={styles.header}>
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
                    tintColor={theme.text}
                    size={22}
                />
            </Pressable>

            <ThemedText type="title" style={styles.pageTitle}>
                {title}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
        gap: Spacing.two,
    },
    back: {
        marginLeft: -Spacing.one,
    },
    pressed: {
        opacity: 0.6,
    },
    pageTitle: {
        flex: 1,
        fontSize: 34,
        lineHeight: 40,
    },
});
