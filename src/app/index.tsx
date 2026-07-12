import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChores } from '@/hooks/use-chores';
import { useMeals } from '@/hooks/use-meals';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';

function getFormattedDate(): string {
    const now = new Date();
    return now.toLocaleDateString('en-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

const priorityColors: Record<string, string> = {
    high: '#E5484D',
    medium: '#F5A623',
    low: '#46A758',
};

export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { meals } = useMeals();
    const { chores } = useChores();
    const { todos } = useTodos();

    const hasMeals = meals.length > 0;

    // Build preview: group by time, show up to 3 items
    const timeLabel: Record<string, string> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        snack: 'Snack',
        dinner: 'Dinner',
    };
    const timeOrder: Record<string, number> = {
        breakfast: 0,
        lunch: 1,
        snack: 2,
        dinner: 3,
    };
    const sortedMeals = [...meals].sort(
        (a, b) => (timeOrder[a.time] ?? 4) - (timeOrder[b.time] ?? 4)
    );
    const mealPreviewItems = sortedMeals
        .slice(0, 3)
        .map((m) => `${timeLabel[m.time]}: ${m.name}`);
    const remainingMeals = meals.length - mealPreviewItems.length;
    const remainingChores = chores.length - 3;
    const activeTodos = todos.filter((t) => !t.done);
    const remainingTodos = activeTodos.length - 2;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Header: title + avatar */}
                    <View style={styles.header}>
                        <ThemedText type="title" style={styles.appTitle}>
                            FamiList
                        </ThemedText>
                        <View
                            style={[
                                styles.avatar,
                                { backgroundColor: theme.backgroundElement },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'person.fill',
                                    web: 'person',
                                }}
                                tintColor={theme.textSecondary}
                                size={20}
                            />
                        </View>
                    </View>

                    {/* Date and day of the week */}
                    <ThemedText
                        themeColor="textSecondary"
                        style={styles.dateText}>
                        {getFormattedDate()}
                    </ThemedText>

                    {/* ─── Daily Meal Card ─── */}
                    <Pressable
                        onPress={() => router.navigate('/daily-meal')}
                        style={({ pressed }) => [
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                            pressed && {
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <View style={styles.cardContent}>
                            <ThemedText type="default" style={styles.cardTitle}>
                                Daily Meal
                            </ThemedText>
                            <View style={styles.cardPreview}>
                                {hasMeals ? (
                                    <>
                                        {mealPreviewItems.map((item, i) => (
                                            <ThemedText
                                                key={i}
                                                themeColor="textSecondary"
                                                type="small"
                                                numberOfLines={1}>
                                                {item}
                                            </ThemedText>
                                        ))}
                                        {remainingMeals > 0 && (
                                            <ThemedText
                                                themeColor="textSecondary"
                                                type="small"
                                                style={{ fontStyle: 'italic' }}>
                                                +{remainingMeals} more
                                            </ThemedText>
                                        )}
                                    </>
                                ) : (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small">
                                        No meals planned yet
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                        <View
                            style={[
                                styles.cardArrow,
                                {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'chevron.right',
                                    web: 'chevron_right',
                                }}
                                tintColor={theme.textSecondary}
                                size={14}
                            />
                        </View>
                    </Pressable>

                    {/* ─── Daily Chores Card ─── */}
                    <Pressable
                        onPress={() => router.navigate('/daily-chores')}
                        style={({ pressed }) => [
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                            pressed && {
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <View style={styles.cardContent}>
                            <ThemedText type="default" style={styles.cardTitle}>
                                Daily Chores
                            </ThemedText>
                            <View style={styles.cardPreview}>
                                {chores.length > 0 ? (
                                    <>
                                        {chores.slice(0, 3).map((item) => (
                                            <View
                                                key={item.id}
                                                style={styles.checkItem}>
                                                <SymbolView
                                                    name={{
                                                        ios: item.done
                                                            ? 'checkmark.square.fill'
                                                            : 'square',
                                                        web: item.done
                                                            ? 'check_box'
                                                            : 'check_box_outline_blank',
                                                    }}
                                                    tintColor={
                                                        item.done
                                                            ? theme.textSecondary
                                                            : theme.text
                                                    }
                                                    size={16}
                                                />
                                                <ThemedText
                                                    themeColor={
                                                        item.done
                                                            ? 'textSecondary'
                                                            : 'text'
                                                    }
                                                    type="small"
                                                    numberOfLines={1}
                                                    style={
                                                        item.done
                                                            ? styles.strikethrough
                                                            : undefined
                                                    }>
                                                    {item.label}
                                                </ThemedText>
                                            </View>
                                        ))}
                                        {remainingChores > 0 && (
                                            <ThemedText
                                                themeColor="textSecondary"
                                                type="small"
                                                style={{
                                                    fontStyle: 'italic',
                                                    marginLeft: 24,
                                                }}>
                                                +{remainingChores} more
                                            </ThemedText>
                                        )}
                                    </>
                                ) : (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small">
                                        No chores for today
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                        <View
                            style={[
                                styles.cardArrow,
                                {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'chevron.right',
                                    web: 'chevron_right',
                                }}
                                tintColor={theme.textSecondary}
                                size={14}
                            />
                        </View>
                    </Pressable>

                    {/* ─── To-Do Card ─── */}
                    <Pressable
                        onPress={() => router.navigate('/todo')}
                        style={({ pressed }) => [
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                            pressed && {
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <View style={styles.cardContent}>
                            <ThemedText type="default" style={styles.cardTitle}>
                                To-Do
                            </ThemedText>
                            <View style={styles.cardPreview}>
                                {activeTodos.length > 0 ? (
                                    <>
                                        {activeTodos.slice(0, 2).map((item) => (
                                            <View
                                                key={item.id}
                                                style={styles.checkItem}>
                                                <SymbolView
                                                    name={{
                                                        ios: 'square',
                                                        web: 'check_box_outline_blank',
                                                    }}
                                                    tintColor={theme.text}
                                                    size={16}
                                                />
                                                <View
                                                    style={[
                                                        styles.priorityDot,
                                                        {
                                                            backgroundColor:
                                                                priorityColors[
                                                                    item
                                                                        .priority
                                                                ],
                                                        },
                                                    ]}
                                                />
                                                <ThemedText
                                                    type="small"
                                                    numberOfLines={1}>
                                                    {item.label}
                                                </ThemedText>
                                            </View>
                                        ))}
                                        {remainingTodos > 0 && (
                                            <ThemedText
                                                themeColor="textSecondary"
                                                type="small"
                                                style={{
                                                    fontStyle: 'italic',
                                                    marginLeft: 40,
                                                }}>
                                                +{remainingTodos} more
                                            </ThemedText>
                                        )}
                                    </>
                                ) : (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small">
                                        No active tasks
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                        <View
                            style={[
                                styles.cardArrow,
                                {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'chevron.right',
                                    web: 'chevron_right',
                                }}
                                tintColor={theme.textSecondary}
                                size={14}
                            />
                        </View>
                    </Pressable>

                    {/* ─── Bottom Row: 3 utility cards ─── */}
                    <View style={styles.bottomRow}>
                        <Pressable
                            onPress={() => router.navigate('/explore')}
                            style={({ pressed }) => [
                                styles.bottomCard,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'creditcard.fill',
                                    web: 'credit_card',
                                }}
                                tintColor={theme.text}
                                size={24}
                            />
                            <ThemedText
                                type="smallBold"
                                style={styles.bottomCardLabel}>
                                Subscriptions
                            </ThemedText>
                        </Pressable>

                        <Pressable
                            onPress={() => router.navigate('/explore')}
                            style={({ pressed }) => [
                                styles.bottomCard,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'calendar.badge.exclamationmark',
                                    web: 'event_busy',
                                }}
                                tintColor={theme.text}
                                size={24}
                            />
                            <ThemedText
                                type="smallBold"
                                style={styles.bottomCardLabel}>
                                {'Payment\nDeadlines'}
                            </ThemedText>
                        </Pressable>

                        <Pressable
                            onPress={() => router.navigate('/explore')}
                            style={({ pressed }) => [
                                styles.bottomCard,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'link',
                                    web: 'link',
                                }}
                                tintColor={theme.text}
                                size={24}
                            />
                            <ThemedText
                                type="smallBold"
                                style={styles.bottomCardLabel}>
                                {'Shared\nLinks'}
                            </ThemedText>
                        </Pressable>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: BottomTabInset + Spacing.four,
        gap: Spacing.three,
    },
    /* ── Header ── */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.two,
    },
    appTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateText: {
        marginTop: -Spacing.two,
    },
    /* ── Section cards ── */
    card: {
        borderRadius: 16,
        padding: Spacing.three,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.three,
    },
    cardContent: {
        flex: 1,
        gap: Spacing.two,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 24,
    },
    cardPreview: {
        gap: Spacing.one,
    },
    cardArrow: {
        width: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    /* ── Bottom row ── */
    bottomRow: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    bottomCard: {
        flex: 1,
        borderRadius: 16,
        padding: Spacing.three,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        minHeight: 100,
    },
    bottomCardLabel: {
        textAlign: 'center',
    },
});
