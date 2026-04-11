import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function DailyChoresScreen() {
    const theme = useTheme();

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ThemedView style={styles.content}>
                    <SymbolView
                        name={{ ios: 'washer.fill', web: 'home' }}
                        tintColor={theme.text}
                        size={48}
                    />
                    <ThemedText type="title">Daily Chores</ThemedText>
                    <ThemedText themeColor="textSecondary">
                        Manage your daily household chores here.
                    </ThemedText>
                </ThemedView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'row',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.four,
        alignItems: 'center',
        gap: Spacing.three,
        paddingBottom: BottomTabInset + Spacing.three,
        maxWidth: MaxContentWidth,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: Spacing.three,
    },
});
