import { type Href, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type PlatformSymbol } from '@/constants/types';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface HubEntry {
    label: string;
    icon: PlatformSymbol;
    path: Href;
}

const entries: HubEntry[] = [
    {
        label: 'Subscriptions',
        icon: { ios: 'creditcard.fill', web: 'credit_card' },
        path: '/subscriptions',
    },
    {
        label: 'When Did I Last',
        icon: { ios: 'clock.arrow.circlepath', web: 'history' },
        path: '/when-did-i-last',
    },
    {
        label: 'Payments',
        icon: { ios: 'banknote.fill', web: 'payments' },
        path: '/payments',
    },
    {
        label: 'Shared Links',
        icon: { ios: 'link', web: 'link' },
        path: '/shared-links',
    },
    {
        label: 'Loaned Items',
        icon: { ios: 'arrow.left.arrow.right', web: 'swap_horiz' },
        path: '/loaned-items',
    },
];

export default function OtherScreen() {
    const theme = useTheme();
    const router = useRouter();

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.pageTitle}>
                        Other
                    </ThemedText>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.list}>
                        {entries.map((entry) => (
                            <Pressable
                                key={entry.label}
                                onPress={() => router.navigate(entry.path)}
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.row,
                                    {
                                        backgroundColor:
                                            theme.backgroundElement,
                                    },
                                    pressed && styles.pressed,
                                ]}>
                                <SymbolView
                                    name={entry.icon}
                                    tintColor={theme.text}
                                    size={22}
                                />
                                <ThemedText style={styles.rowLabel}>
                                    {entry.label}
                                </ThemedText>
                                <SymbolView
                                    name={{
                                        ios: 'chevron.right',
                                        web: 'chevron_right',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={16}
                                />
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
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
    header: {
        paddingTop: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
        gap: Spacing.one,
    },
    pageTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: BottomTabInset + Spacing.six,
    },
    list: {
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
    rowLabel: {
        flex: 1,
    },
    pressed: {
        opacity: 0.7,
    },
});
