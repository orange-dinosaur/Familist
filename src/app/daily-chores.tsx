import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dailyChores } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function DailyChoresScreen() {
    const theme = useTheme();

    const doneCount = dailyChores.filter((c) => c.done).length;
    const progress = Math.round((doneCount / dailyChores.length) * 100);

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <ThemedText type="title" style={styles.pageTitle}>
                            Daily Chores
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {doneCount} of {dailyChores.length} completed
                        </ThemedText>
                    </View>

                    {/* Progress bar */}
                    <View
                        style={[
                            styles.progressTrack,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progress}%`,
                                    backgroundColor: theme.text,
                                },
                            ]}
                        />
                    </View>

                    {/* Chore list */}
                    {dailyChores.map((chore, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.choreRow,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: chore.done
                                        ? 'checkmark.circle.fill'
                                        : 'circle',
                                    web: chore.done
                                        ? 'check_circle'
                                        : 'radio_button_unchecked',
                                }}
                                tintColor={
                                    chore.done
                                        ? theme.textSecondary
                                        : theme.text
                                }
                                size={22}
                            />
                            <ThemedText
                                type="default"
                                themeColor={
                                    chore.done ? 'textSecondary' : 'text'
                                }
                                style={
                                    chore.done
                                        ? styles.strikethrough
                                        : undefined
                                }>
                                {chore.label}
                            </ThemedText>
                        </Pressable>
                    ))}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: BottomTabInset + Spacing.four,
        gap: Spacing.two,
    },
    header: {
        paddingTop: Spacing.two,
        gap: Spacing.one,
    },
    pageTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    subtitle: {
        marginTop: -Spacing.one,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: Spacing.two,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    choreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 14,
        padding: Spacing.three,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
});
