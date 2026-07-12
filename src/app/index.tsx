import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_USERS } from '@/constants/mock-data';
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
    const { chores, toggleChore } = useChores();
    const { todos, toggleTodo } = useTodos();

    const [mealsExpanded, setMealsExpanded] = useState(false);
    const [choresExpanded, setChoresExpanded] = useState(false);
    const [todosExpanded, setTodosExpanded] = useState(false);

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
                    {/* Header: Title and User Avatar */}
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <ThemedText type="title">FamiList</ThemedText>
                            <View
                                style={[
                                    styles.userAvatar,
                                    {
                                        backgroundColor:
                                            theme.backgroundSelected,
                                    },
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
                    </View>

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
                                            {meals.map((item, i) => (
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
                                            No meals planned yet
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
                                    chores.length > 0 ? (
                                        <View style={styles.expandedList}>
                                            {chores.map((item) => {
                                                const assignee =
                                                    MOCK_USERS.find(
                                                        (u) =>
                                                            u.id ===
                                                            item.assigneeId
                                                    );
                                                return (
                                                    <Pressable
                                                        key={item.id}
                                                        onPress={() =>
                                                            toggleChore(item.id)
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
                                                                item.done
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
                                                            <View
                                                                style={[
                                                                    styles.assigneeAvatar,
                                                                    {
                                                                        backgroundColor:
                                                                            assignee.color,
                                                                    },
                                                                ]}>
                                                                <ThemedText
                                                                    style={
                                                                        styles.assigneeInitials
                                                                    }>
                                                                    {
                                                                        assignee.initials
                                                                    }
                                                                </ThemedText>
                                                            </View>
                                                        )}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <ThemedText
                                            themeColor="textSecondary"
                                            type="small">
                                            No chores for today
                                        </ThemedText>
                                    )
                                ) : chores.length > 0 ? (
                                    <>
                                        {chores.slice(0, 3).map((item) => {
                                            const assignee = MOCK_USERS.find(
                                                (u) => u.id === item.assigneeId
                                            );
                                            return (
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
                                                        style={[
                                                            styles.todoLabel,
                                                            item.done &&
                                                                styles.strikethrough,
                                                        ]}>
                                                        {item.label}
                                                    </ThemedText>
                                                    {assignee && (
                                                        <View
                                                            style={[
                                                                styles.assigneeAvatar,
                                                                {
                                                                    backgroundColor:
                                                                        assignee.color,
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: 11,
                                                                },
                                                            ]}>
                                                            <ThemedText
                                                                style={[
                                                                    styles.assigneeInitials,
                                                                    {
                                                                        fontSize: 10,
                                                                    },
                                                                ]}>
                                                                {
                                                                    assignee.initials
                                                                }
                                                            </ThemedText>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
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
                                    todos.length > 0 ? (
                                        <View style={styles.expandedList}>
                                            {todos.map((item) => {
                                                const assignee =
                                                    MOCK_USERS.find(
                                                        (u) =>
                                                            u.id ===
                                                            item.assigneeId
                                                    );
                                                return (
                                                    <Pressable
                                                        key={item.id}
                                                        onPress={() =>
                                                            toggleTodo(item.id)
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
                                                                item.done
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
                                                                        priorityColors[
                                                                            item
                                                                                .priority
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
                                                            <View
                                                                style={[
                                                                    styles.assigneeAvatar,
                                                                    {
                                                                        backgroundColor:
                                                                            assignee.color,
                                                                    },
                                                                ]}>
                                                                <ThemedText
                                                                    style={
                                                                        styles.assigneeInitials
                                                                    }>
                                                                    {
                                                                        assignee.initials
                                                                    }
                                                                </ThemedText>
                                                            </View>
                                                        )}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <ThemedText
                                            themeColor="textSecondary"
                                            type="small">
                                            No tasks remaining
                                        </ThemedText>
                                    )
                                ) : activeTodos.length > 0 ? (
                                    <>
                                        {activeTodos.slice(0, 2).map((item) => {
                                            const assignee = MOCK_USERS.find(
                                                (u) => u.id === item.assigneeId
                                            );
                                            return (
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
                                                        numberOfLines={1}
                                                        style={
                                                            styles.todoLabel
                                                        }>
                                                        {item.label}
                                                    </ThemedText>
                                                    {assignee && (
                                                        <View
                                                            style={[
                                                                styles.assigneeAvatar,
                                                                {
                                                                    backgroundColor:
                                                                        assignee.color,
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: 11,
                                                                },
                                                            ]}>
                                                            <ThemedText
                                                                style={[
                                                                    styles.assigneeInitials,
                                                                    {
                                                                        fontSize: 10,
                                                                    },
                                                                ]}>
                                                                {
                                                                    assignee.initials
                                                                }
                                                            </ThemedText>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
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
                    </View>

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
                                size={22}
                            />
                            <ThemedText
                                type="small"
                                style={styles.bottomCardLabel}>
                                Bills
                            </ThemedText>
                        </Pressable>

                        <Pressable
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
                                size={22}
                            />
                            <ThemedText
                                type="small"
                                style={styles.bottomCardLabel}>
                                Links
                            </ThemedText>
                        </Pressable>

                        <Pressable
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
                                    ios: 'gearshape.fill',
                                    web: 'settings',
                                }}
                                tintColor={theme.text}
                                size={22}
                            />
                            <ThemedText
                                type="small"
                                style={styles.bottomCardLabel}>
                                Settings
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
        paddingBottom: BottomTabInset + Spacing.six,
        gap: Spacing.three,
    },
    header: {
        paddingTop: Spacing.two,
        gap: Spacing.one,
        marginBottom: Spacing.two,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
    assigneeAvatar: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeInitials: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
});
