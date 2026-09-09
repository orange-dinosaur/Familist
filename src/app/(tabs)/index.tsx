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
import { useChoreDefinitions } from '@/hooks/use-chore-definitions';
import { useChores } from '@/hooks/use-chores';
import { useMeals } from '@/hooks/use-meals';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';
import { byUrgency } from '@/utils/todo';

/** The day names the screen; the date sits under it. */
function today(): { weekday: string; date: string } {
    const now = new Date();
    return {
        weekday: now.toLocaleDateString(undefined, { weekday: 'long' }),
        date: now.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
    };
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
        loading: rowsLoading,
        error: choresError,
        toggleChore,
    } = useChores();
    const { definitions, loading: namesLoading } = useChoreDefinitions();
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
    /** The card lists what is left to do; a chore ticked off leaves it. */
    const openChores = todayChores.filter((c) => !c.done);
    const choresEmptyText =
        todayChores.length > 0 ? 'All chores done' : 'No chores for today';
    /**
     * A chore is named by the family's chore it was planned from, so the card
     * has both collections to wait for rather than one.
     */
    const choreNames = new Map(definitions.map((one) => [one.id, one.name]));
    const choresLoading = rowsLoading || namesLoading;
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
    const shownMeals = mealsExpanded ? sortedMeals : sortedMeals.slice(0, 3);
    const remainingMeals = todayMeals.length - shownMeals.length;
    const remainingChores = openChores.length - 3;

    const { weekday, date } = today();

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

                <View style={styles.header}>
                    <View style={styles.headerDay}>
                        <ThemedText type="title">{weekday}</ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.dateText}>
                            {date}
                        </ThemedText>
                    </View>
                    <View style={styles.headerFigure}>
                        <ThemedText type="figureLarge" themeColor="memberSage">
                            {openChores.length + openTodos.length}
                        </ThemedText>
                        <ThemedText type="label" themeColor="textSecondary">
                            Open
                        </ThemedText>
                    </View>
                </View>

                {/* Two collections, one line; chores win if both spoke. */}
                {(choresError ?? todosError) && (
                    <ThemedText
                        type="small"
                        style={[styles.error, { color: theme.destructive }]}>
                        {choresError ?? todosError}
                    </ThemedText>
                )}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    <View
                        style={[
                            styles.section,
                            { borderTopColor: `${theme.text}29` },
                        ]}>
                        <View style={styles.sectionContent}>
                            <View style={styles.sectionHeader}>
                                <Pressable
                                    onPress={() =>
                                        setMealsExpanded(!mealsExpanded)
                                    }
                                    style={styles.sectionHeaderLeft}>
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
                                        size={12}
                                    />
                                    <ThemedText type="label">Meals</ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() =>
                                        router.navigate('/daily-meal')
                                    }
                                    style={styles.sectionLink}>
                                    <ThemedText
                                        themeColor="textSecondary"
                                        style={styles.sectionCount}>
                                        {todayMeals.length} planned
                                    </ThemedText>
                                    <SymbolView
                                        name={{
                                            ios: 'chevron.right',
                                            web: 'chevron_right',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={12}
                                    />
                                </Pressable>
                            </View>
                            <View style={styles.rows}>
                                {hasMeals ? (
                                    <>
                                        {shownMeals.map((item, i) => (
                                            <View key={i} style={styles.row}>
                                                <ThemedText
                                                    type="label"
                                                    themeColor="textSecondary"
                                                    style={styles.mealTime}>
                                                    {timeLabel[item.time]}
                                                </ThemedText>
                                                <ThemedText
                                                    type="small"
                                                    style={styles.rowLabel}>
                                                    {item.name}
                                                </ThemedText>
                                            </View>
                                        ))}
                                        {hiddenMealsCount > 0 && (
                                            <ThemedText
                                                type="note"
                                                themeColor="textMuted"
                                                style={styles.moreClue}>
                                                +{hiddenMealsCount} more
                                            </ThemedText>
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

                    <View
                        style={[
                            styles.section,
                            { borderTopColor: `${theme.text}29` },
                        ]}>
                        <View style={styles.sectionContent}>
                            <View style={styles.sectionHeader}>
                                <Pressable
                                    onPress={() =>
                                        setChoresExpanded(!choresExpanded)
                                    }
                                    style={styles.sectionHeaderLeft}>
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
                                        size={12}
                                    />
                                    <ThemedText type="label">Chores</ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() =>
                                        router.navigate('/daily-chores')
                                    }
                                    style={styles.sectionLink}>
                                    <ThemedText
                                        themeColor="textSecondary"
                                        style={styles.sectionCount}>
                                        {todayChores.length - openChores.length}{' '}
                                        of {todayChores.length} done
                                    </ThemedText>
                                    <SymbolView
                                        name={{
                                            ios: 'chevron.right',
                                            web: 'chevron_right',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={12}
                                    />
                                </Pressable>
                            </View>
                            <View style={styles.rows}>
                                {choresExpanded ? (
                                    openChores.length > 0 ? (
                                        <View>
                                            {openChores.map((item) => {
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
                                                        style={styles.row}>
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
                                                                styles.rowLabel,
                                                                item.done &&
                                                                    styles.strikethrough,
                                                            ]}>
                                                            {choreNames.get(
                                                                item.definitionId
                                                            ) ?? ''}
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
                                                : choresEmptyText}
                                        </ThemedText>
                                    )
                                ) : openChores.length > 0 ? (
                                    <>
                                        {openChores.slice(0, 3).map((item) => {
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
                                                    style={styles.row}>
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
                                                        numberOfLines={1}
                                                        style={[
                                                            styles.rowLabel,
                                                            item.done &&
                                                                styles.strikethrough,
                                                        ]}>
                                                        {choreNames.get(
                                                            item.definitionId
                                                        ) ?? ''}
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
                                            <ThemedText
                                                type="note"
                                                themeColor="textMuted"
                                                style={styles.moreClue}>
                                                +{hiddenChoresCount} more
                                            </ThemedText>
                                        )}
                                    </>
                                ) : (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small">
                                        {choresLoading ? '' : choresEmptyText}
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.section,
                            { borderTopColor: `${theme.text}29` },
                        ]}>
                        <View style={styles.sectionContent}>
                            <View style={styles.sectionHeader}>
                                <Pressable
                                    onPress={() =>
                                        setTodosExpanded(!todosExpanded)
                                    }
                                    style={styles.sectionHeaderLeft}>
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
                                        size={12}
                                    />
                                    <ThemedText type="label">To-do</ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() => router.navigate('/todo')}
                                    style={styles.sectionLink}>
                                    <ThemedText
                                        themeColor="textSecondary"
                                        style={styles.sectionCount}>
                                        {openTodos.length} open
                                    </ThemedText>
                                    <SymbolView
                                        name={{
                                            ios: 'chevron.right',
                                            web: 'chevron_right',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={12}
                                    />
                                </Pressable>
                            </View>
                            <View style={styles.rows}>
                                {todosExpanded ? (
                                    openTodos.length > 0 ? (
                                        <View>
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
                                                        style={styles.row}>
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
                                                                styles.priorityBar,
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
                                                                styles.rowLabel,
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
                                                    style={styles.row}>
                                                    <SymbolView
                                                        name={{
                                                            ios: 'circle',
                                                            web: 'radio_button_unchecked',
                                                        }}
                                                        tintColor={
                                                            canToggle(
                                                                item.assigneeId
                                                            )
                                                                ? theme.text
                                                                : theme.textSecondary
                                                        }
                                                        size={18}
                                                    />
                                                    <View
                                                        style={[
                                                            styles.priorityBar,
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
                                                        style={styles.rowLabel}>
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
                                            <ThemedText
                                                type="note"
                                                themeColor="textMuted"
                                                style={styles.moreClue}>
                                                +{hiddenTodosCount} more
                                            </ThemedText>
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
                                            <ThemedText
                                                type="note"
                                                themeColor="textMuted"
                                                style={styles.moreClue}>
                                                +{hiddenTodosCount} completed
                                                task
                                                {hiddenTodosCount > 1
                                                    ? 's'
                                                    : ''}{' '}
                                                hidden
                                            </ThemedText>
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
        paddingBottom: BottomTabInset + Spacing.three,
        gap: Spacing.three,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
    },
    headerDay: {
        flex: 1,
    },
    headerFigure: {
        alignItems: 'flex-end',
        paddingBottom: Spacing.half,
    },
    dateText: {
        marginTop: Spacing.two,
        fontSize: 13,
        lineHeight: 18,
    },
    error: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
    },
    /* ── Sections ── */
    section: {
        borderTopWidth: 1,
        paddingTop: Spacing.three,
    },
    sectionContent: {
        gap: Spacing.two,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        flex: 1,
    },
    sectionLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
    },
    sectionCount: {
        fontSize: 11,
        lineHeight: 16,
    },
    /* ── Rows ── */
    rows: {
        paddingTop: Spacing.half,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.two,
    },
    rowLabel: {
        flex: 1,
    },
    mealTime: {
        width: 62,
    },
    priorityBar: {
        width: 3,
        height: 16,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    moreClue: {
        paddingTop: Spacing.one,
        marginLeft: 31,
    },
});
