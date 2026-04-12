import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { todoItems, type TodoItem } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const priorityConfig: Record<
    TodoItem['priority'],
    { label: string; color: string }
> = {
    high: { label: 'High', color: '#E5484D' },
    medium: { label: 'Med', color: '#F5A623' },
    low: { label: 'Low', color: '#46A758' },
};

export default function TodoScreen() {
    const theme = useTheme();

    const pendingCount = todoItems.filter((t) => !t.done).length;

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
                            To-Do
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {pendingCount} tasks remaining
                        </ThemedText>
                    </View>

                    {/* Active tasks */}
                    <ThemedText type="default" style={styles.sectionTitle}>
                        Active
                    </ThemedText>
                    {todoItems
                        .filter((t) => !t.done)
                        .map((item, i) => (
                            <Pressable
                                key={`active-${i}`}
                                style={({ pressed }) => [
                                    styles.todoRow,
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
                                        ios: 'circle',
                                        web: 'radio_button_unchecked',
                                    }}
                                    tintColor={theme.text}
                                    size={22}
                                />
                                <View style={styles.todoContent}>
                                    <ThemedText type="default">
                                        {item.label}
                                    </ThemedText>
                                </View>
                                <View
                                    style={[
                                        styles.priorityBadge,
                                        {
                                            backgroundColor:
                                                priorityConfig[item.priority]
                                                    .color + '20',
                                        },
                                    ]}>
                                    <ThemedText
                                        type="small"
                                        style={{
                                            color: priorityConfig[item.priority]
                                                .color,
                                            fontWeight: '600',
                                        }}>
                                        {priorityConfig[item.priority].label}
                                    </ThemedText>
                                </View>
                            </Pressable>
                        ))}

                    {/* Completed tasks */}
                    <ThemedText
                        type="default"
                        style={[
                            styles.sectionTitle,
                            { marginTop: Spacing.two },
                        ]}>
                        Completed
                    </ThemedText>
                    {todoItems
                        .filter((t) => t.done)
                        .map((item, i) => (
                            <Pressable
                                key={`done-${i}`}
                                style={({ pressed }) => [
                                    styles.todoRow,
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
                                        ios: 'checkmark.circle.fill',
                                        web: 'check_circle',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={22}
                                />
                                <ThemedText
                                    type="default"
                                    themeColor="textSecondary"
                                    style={styles.strikethrough}>
                                    {item.label}
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: Spacing.one,
    },
    todoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 14,
        padding: Spacing.three,
    },
    todoContent: {
        flex: 1,
    },
    priorityBadge: {
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        borderRadius: 8,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
});
