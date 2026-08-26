import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { MemberAvatar } from '@/components/member-avatar';
import { ThemedView } from '@/components/themed-view';

import { getRelativeDateString } from '@/constants/dates';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChores } from '@/hooks/use-chores';
import { useMeals } from '@/hooks/use-meals';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';
import { byUrgency } from '@/utils/todo';

function getFormattedDate(): string {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

const priorityColors = {
    high: 'priorityHigh',
    medium: 'priorityMedium',
    low: 'priorityLow',
} as const;

export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { members } = useMembers();
    const { meals, loading: mealsLoading } = useMeals();
    const {
        chores,
        loading: choresLoading,
        error: choresError,
        toggleChore,
    } = useChores();
    const {
        todos,
        loading: todosLoading,
        error: todosError,
        toggleTodo,
    } = useTodos();
    const { canToggle } = usePermissions();

    const [mealsExpanded, setMealsExpanded] = useState(false);
    const [choresExpanded, setChoresExpanded] = useState(false);
    const [todosExpanded, setTodosExpanded] = useState(false);

    const todayStr = getRelativeDateString(0);
    const todayMeals = meals.filter((m) => m.day === todayStr);
    /** Inactive chores are rows for days they are not planned for. */
    const todayChores = chores.filter((c) => c.active && c.day === todayStr);
    /**
     * To-dos are not kept by day, so the card previews the list itself: the
     * open ones in the order the to-do screen puts them, overdue first.
     */
    const openTodos = todos.filter((t) => !t.done).sort(byUrgency);

    const hasMeals = todayMeals.length > 0;

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
    const sortedMeals = [...todayMeals].sort(
        (a, b) => (timeOrder[a.time] ?? 4) - (timeOrder[b.time] ?? 4)
    );
    const mealPreviewItems = sortedMeals
        .slice(0, 3)
        .map((m) => `${timeLabel[m.time]}: ${m.name}`);
    const remainingMeals = todayMeals.length - mealPreviewItems.length;
    const remainingChores = todayChores.length - 3;

    const hiddenMealsCount = !mealsExpanded ? Math.max(0, remainingMeals) : 0;
    const hiddenChoresCount = !choresExpanded
        ? Math.max(0, remainingChores)
        : 0;
    const hiddenTodosCount = !todosExpanded
        ? Math.max(0, openTodos.length - 2)
        : 0;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="title">FamiList</ThemedText>

                    {/* Date and day of the week */}
                    <ThemedText
                        themeColor="textSecondary"
                        style={styles.dateText}>
                        {getFormattedDate()}
                    </ThemedText>

                    {/* Two collections, one line; chores win if both spoke. */}
                    {(choresError ?? todosError) && (
                        <ThemedText
                            type="small"
                            style={{ color: theme.destructive }}>
                            {choresError ?? todosError}
                        </ThemedText>
                    )}
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* ─── Daily Meal Card ─── */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeaderRow}>
                                <Pressable
                                    onPress={() =>
                                        setMealsExpanded(!mealsExpanded)
                                    }
                                    style={styles.cardHeaderLeft}>
                                    <SymbolView
                                        name={{
                                            ios: mealsExpanded
                                                ? 'chevron.down'
                                                : 'chevron.right',
                                            web: mealsExpanded
                                                ? 'expand_less'
                                                : 'expand_more',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={16}
                                    />
                                    <ThemedText
                                        type="default"
                                        style={styles.cardTitle}>
                                        Daily Meal
                                    </ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() =>
                                        router.navigate('/daily-meal')
                                    }
                                    style={styles.cardArrowButton}>
                                    <SymbolView
                                        name={{
                                            ios: 'arrow.up.right.circle.fill',
                                            web: 'open_in_new',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={20}
                                    />
                                </Pressable>
                            </View>
                            <View style={styles.cardPreview}>
                                {mealsExpanded ? (
                                    hasMeals ? (
                                        <View style={styles.expandedMealsList}>
                                            {todayMeals.map((item, i) => (
                                                <View
                                                    key={i}
                                                    style={
                                                        styles.expandedMealRow
                                                    }>
                                                    <ThemedText
                                                        type="small"
                                                        style={
                                                            styles.expandedMealTime
                                                        }>
                                                        {item.time
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            item.time.slice(1)}
                                                        :
                                                    </ThemedText>
                                                    <ThemedText
                                                        type="small"
                                                        style={
                                                            styles.expandedMealName
                                                        }>
                                                        {item.name}
                                                    </ThemedText>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <ThemedText
                                            themeColor="textSecondary"
                                            type="small">
                                            {mealsLoading
                                                ? ''
                                                : 'No meals planned yet'}
                                        </ThemedText>
                                    )
                                ) : hasMeals ? (
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
                                        {hiddenMealsCount > 0 && (
                                            <View
                                                style={styles.subtleHiddenClue}>
                                                <SymbolView
                                                    name={{
                                                        ios: 'eye.slash',
                                                        web: 'visibility_off',
                                                    }}
                                                    tintColor={
                                                        theme.textSecondary
                                                    }
                                                    size={12}
                                                />
                                                <ThemedText
                                                    themeColor="textSecondary"
                                                    type="small"
                                                    style={{
                                                        fontStyle: 'italic',
                                                    }}>
                                                    +{hiddenMealsCount} more
                                                </ThemedText>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small">
                                        {mealsLoading
                                            ? ''
                                            : 'No meals planned yet'}
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* ─── Daily Chores Card ─── */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeaderRow}>
                                <Pressable
                                    onPress={() =>
                                        setChoresExpanded(!choresExpanded)
                                    }
                                    style={styles.cardHeaderLeft}>
                                    <SymbolView
                                        name={{
                                            ios: choresExpanded
                                                ? 'chevron.down'
                                                : 'chevron.right',
                                            web: choresExpanded
                                                ? 'expand_less'
                                                : 'expand_more',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={16}
                                    />
                                    <ThemedText
                                        type="default"
                                        style={styles.cardTitle}>
                                        Daily Chores
                                    </ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() =>
                                        router.navigate('/daily-chores')
                                    }
                                    style={styles.cardArrowButton}>
                                    <SymbolView
                                        name={{
                                            ios: 'arrow.up.right.circle.fill',
                                            web: 'open_in_new',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={20}
                                    />
                                </Pressable>
                            </View>
                            <View style={styles.cardPreview}>
                                {choresExpanded ? (
                                    todayChores.length > 0 ? (
                                        <View style={styles.expandedList}>
                                            {todayChores.map((item) => {
                                                const assignee = members.find(
                                                    (u) =>
                                                        u.id === item.assigneeId
                                                );
                                                return (
                                                    <Pressable
                                                        key={item.id}
                                                        onPress={() =>
                                                            toggleChore(item.id)
                                                        }
                                                        disabled={
                                                            !canToggle(
                                                                item.assigneeId
                                                            )
                                                        }
                                                        style={
                                                            styles.expandedCheckItem
                                                        }>
                                                        <SymbolView
                                                            name={{
                                                                ios: item.done
                                                                    ? 'checkmark.circle.fill'
                                                                    : 'circle',
                                                                web: item.done
                                                                    ? 'check_circle'
                                                                    : 'radio_button_unchecked',
                                                            }}
                                                            tintColor={
                                                                item.done ||
                                                                !canToggle(
                                                                    item.assigneeId
                                                                )
                                                                    ? theme.textSecondary
                                                                    : theme.text
                                                            }
                                                            size={18}
                                                        />
                                                        <ThemedText
                                                            themeColor={
                                                                item.done
                                                                    ? 'textSecondary'
                                                                    : 'text'
                                                            }
                                                            type="small"
                                                            style={[
                                                                styles.todoLabel,
                                                                item.done &&
                                                                    styles.strikethrough,
                                                            ]}>
                                                            {item.label}
                                                        </ThemedText>
                                                        {assignee && (
                                                            <MemberAvatar
                                                                member={
                                                                    assignee
                                                                }
                                                                size={26}
                                                            />
                                                        )}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <ThemedText
                                            themeColor="textSecondary"
                                            type="small">
                                            {choresLoading
                                                ? ''
                                                : 'No chores for today'}
                                        </ThemedText>
                                    )
                                ) : todayChores.length > 0 ? (
                                    <>
                                        {todayChores.slice(0, 3).map((item) => {
                                            const assignee = members.find(
                                                (u) => u.id === item.assigneeId
                                            );
                                            return (
                                                <Pressable
                                                    key={item.id}
                                                    onPress={() =>
                                                        toggleChore(item.id)
                                                    }
                                                    disabled={
                                                        !canToggle(
                                                            item.assigneeId
                                                        )
                                                    }
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
                                                            item.done ||
                                                            !canToggle(
                                                                item.assigneeId
                                                            )
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
                                                        style={[
                                                            styles.todoLabel,
                                                            item.done &&
                                                                styles.strikethrough,
                                                        ]}>
                                                        {item.label}
                                                    </ThemedText>
                                                    {assignee && (
                                                        <MemberAvatar
                                                            member={assignee}
                                                            size={22}
                                                        />
                                                    )}
                                                </Pressable>
                                            );
                                        })}
                                        {hiddenChoresCount > 0 && (
                                            <View
                                                style={[
                                                    styles.subtleHiddenClue,
                                                    { marginLeft: 24 },
                                                ]}>
                                                <SymbolView
                                                    name={{
                                                        ios: 'eye.slash',
                                                        web: 'visibility_off',
                                                    }}
                                                    tintColor={
                                                        theme.textSecondary
                                                    }
                                                    size={12}
                                                />
                                                <ThemedText
                                                    themeColor="textSecondary"
                                                    type="small"
                                                    style={{
                                                        fontStyle: 'italic',
                                                    }}>
                                                    +{hiddenChoresCount} more
                                                </ThemedText>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small">
                                        {choresLoading
                                            ? ''
                                            : 'No chores for today'}
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* ─── To-Do Card ─── */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeaderRow}>
                                <Pressable
                                    onPress={() =>
                                        setTodosExpanded(!todosExpanded)
                                    }
                                    style={styles.cardHeaderLeft}>
                                    <SymbolView
                                        name={{
                                            ios: todosExpanded
                                                ? 'chevron.down'
                                                : 'chevron.right',
                                            web: todosExpanded
                                                ? 'expand_less'
                                                : 'expand_more',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={16}
                                    />
                                    <ThemedText
                                        type="default"
                                        style={styles.cardTitle}>
                                        To-Do
                                    </ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() => router.navigate('/todo')}
                                    style={styles.cardArrowButton}>
                                    <SymbolView
                                        name={{
                                            ios: 'arrow.up.right.circle.fill',
                                            web: 'open_in_new',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={20}
                                    />
                                </Pressable>
                            </View>
                            <View style={styles.cardPreview}>
                                {todosExpanded ? (
                                    openTodos.length > 0 ? (
                                        <View style={styles.expandedList}>
                                            {openTodos.map((item) => {
                                                const assignee = members.find(
                                                    (u) =>
                                                        u.id === item.assigneeId
                                                );
                                                return (
                                                    <Pressable
                                                        key={item.id}
                                                        onPress={() =>
                                                            toggleTodo(item.id)
                                                        }
                                                        disabled={
                                                            !canToggle(
                                                                item.assigneeId
                                                            )
                                                        }
                                                        style={
                                                            styles.expandedCheckItem
                                                        }>
                                                        <SymbolView
                                                            name={{
                                                                ios: item.done
                                                                    ? 'checkmark.circle.fill'
                                                                    : 'circle',
                                                                web: item.done
                                                                    ? 'check_circle'
                                                                    : 'radio_button_unchecked',
                                                            }}
                                                            tintColor={
                                                                item.done ||
                                                                !canToggle(
                                                                    item.assigneeId
                                                                )
                                                                    ? theme.textSecondary
                                                                    : theme.text
                                                            }
                                                            size={18}
                                                        />
                                                        <View
                                                            style={[
                                                                styles.priorityDot,
                                                                {
                                                                    backgroundColor:
                                                                        theme[
                                                                            priorityColors[
                                                                                item
                                                                                    .priority
                                                                            ]
                                                                        ],
                                                                },
                                                            ]}
                                                        />
                                                        <ThemedText
                                                            themeColor={
                                                                item.done
                                                                    ? 'textSecondary'
                                                                    : 'text'
                                                            }
                                                            type="small"
                                                            style={[
                                                                styles.todoLabel,
                                                                item.done &&
                                                                    styles.strikethrough,
                                                            ]}>
                                                            {item.label}
                                                        </ThemedText>
                                                        {assignee && (
                                                            <MemberAvatar
                                                                member={
                                                                    assignee
                                                                }
                                                                size={26}
                                                            />
                                                        )}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <ThemedText
                                            themeColor="textSecondary"
                                            type="small">
                                            {todosLoading
                                                ? ''
                                                : 'No tasks remaining'}
                                        </ThemedText>
                                    )
                                ) : openTodos.length > 0 ? (
                                    <>
                                        {openTodos.slice(0, 2).map((item) => {
                                            const assignee = members.find(
                                                (u) => u.id === item.assigneeId
                                            );
                                            return (
                                                <Pressable
                                                    key={item.id}
                                                    onPress={() =>
                                                        toggleTodo(item.id)
                                                    }
                                                    disabled={
                                                        !canToggle(
                                                            item.assigneeId
                                                        )
                                                    }
                                                    style={styles.checkItem}>
                                                    <SymbolView
                                                        name={{
                                                            ios: 'square',
                                                            web: 'check_box_outline_blank',
                                                        }}
                                                        tintColor={
                                                            canToggle(
                                                                item.assigneeId
                                                            )
                                                                ? theme.text
                                                                : theme.textSecondary
                                                        }
                                                        size={16}
                                                    />
                                                    <View
                                                        style={[
                                                            styles.priorityDot,
                                                            {
                                                                backgroundColor:
                                                                    theme[
                                                                        priorityColors[
                                                                            item
                                                                                .priority
                                                                        ]
                                                                    ],
                                                            },
                                                        ]}
                                                    />
                                                    <ThemedText
                                                        type="small"
                                                        numberOfLines={1}
                                                        style={
                                                            styles.todoLabel
                                                        }>
                                                        {item.label}
                                                    </ThemedText>
                                                    {assignee && (
                                                        <MemberAvatar
                                                            member={assignee}
                                                            size={22}
                                                        />
                                                    )}
                                                </Pressable>
                                            );
                                        })}
                                        {hiddenTodosCount > 0 && (
                                            <View
                                                style={[
                                                    styles.subtleHiddenClue,
                                                    { marginLeft: 40 },
                                                ]}>
                                                <SymbolView
                                                    name={{
                                                        ios: 'eye.slash',
                                                        web: 'visibility_off',
                                                    }}
                                                    tintColor={
                                                        theme.textSecondary
                                                    }
                                                    size={12}
                                                />
                                                <ThemedText
                                                    themeColor="textSecondary"
                                                    type="small"
                                                    style={{
                                                        fontStyle: 'italic',
                                                    }}>
                                                    +{hiddenTodosCount} more
                                                </ThemedText>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View>
                                        <ThemedText
                                            themeColor="textSecondary"
                                            type="small">
                                            No active tasks
                                        </ThemedText>
                                        {hiddenTodosCount > 0 && (
                                            <View
                                                style={[
                                                    styles.subtleHiddenClue,
                                                    { marginLeft: 0 },
                                                ]}>
                                                <SymbolView
                                                    name={{
                                                        ios: 'eye.slash',
                                                        web: 'visibility_off',
                                                    }}
                                                    tintColor={
                                                        theme.textSecondary
                                                    }
                                                    size={12}
                                                />
                                                <ThemedText
                                                    themeColor="textSecondary"
                                                    type="small"
                                                    style={{
                                                        fontStyle: 'italic',
                                                    }}>
                                                    +{hiddenTodosCount}{' '}
                                                    completed task
                                                    {hiddenTodosCount > 1
                                                        ? 's'
                                                        : ''}{' '}
                                                    hidden
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
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
        paddingBottom: BottomTabInset + Spacing.six,
        gap: Spacing.three,
    },
    header: {
        paddingTop: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
        gap: Spacing.one,
        marginBottom: Spacing.two,
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
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.one,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        flex: 1,
    },
    cardArrowButton: {
        padding: Spacing.one,
    },
    expandedMealsList: {
        gap: Spacing.two,
        marginTop: Spacing.one,
    },
    expandedMealRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        alignItems: 'center',
    },
    expandedMealTime: {
        fontWeight: '600',
        width: 80,
    },
    expandedMealName: {
        flex: 1,
    },
    expandedList: {
        gap: Spacing.two,
        marginTop: Spacing.one,
    },
    expandedCheckItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.half,
    },
    todoLabel: {
        flex: 1,
    },
    // Assignee styling
    subtleHiddenClue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        marginTop: Spacing.one,
    },
});
