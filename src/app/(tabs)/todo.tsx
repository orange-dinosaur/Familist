import { SymbolView } from 'expo-symbols';
import React, { useState, useRef } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceCard } from '@/components/choice-card';
import {
    DateRow,
    FormField,
    FormSheet,
    MemberPicker,
    OptionTabs,
} from '@/components/form-sheet';
import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { MemberAvatar } from '@/components/member-avatar';
import { ThemedView } from '@/components/themed-view';
import {
    formatDaysUntil,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/dates';
import { type TodoItem } from '@/constants/types';
import {
    BottomTabInset,
    Fonts,
    MaxContentWidth,
    Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useTodos } from '@/hooks/use-todos';
import {
    byCompletion,
    sortTodos,
    TODO_SORTS,
    type TodoSort,
} from '@/utils/todo';

const priorityColors = {
    low: 'priorityLow',
    medium: 'priorityMedium',
    high: 'priorityHigh',
} as const;

const PRIORITIES = [
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
] as const;

interface TodoRowProps {
    todo: TodoItem;
    overdue: boolean;
    canManage: boolean;
    canToggle: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAssign: () => void;
    theme: any;
}

const TodoRow = React.memo(
    ({
        todo,
        overdue,
        canManage,
        canToggle,
        onToggle,
        onEdit,
        onDelete,
        onAssign,
        theme,
    }: TodoRowProps) => {
        const { members } = useMembers();
        const swipeableRef = useRef<Swipeable>(null);

        const renderRightActions = (
            progress: Animated.AnimatedInterpolation<number>,
            dragX: Animated.AnimatedInterpolation<number>
        ) => {
            const trans = dragX.interpolate({
                inputRange: [-160, 0],
                outputRange: [0, 160],
                extrapolate: 'clamp',
            });
            return (
                <View style={styles.rightActionsContainer}>
                    <Animated.View
                        style={[
                            styles.actionButton,
                            {
                                transform: [{ translateX: trans }],
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <Pressable
                            style={styles.actionPressable}
                            onPress={() => {
                                swipeableRef.current?.close();
                                onEdit();
                            }}>
                            <SymbolView
                                name={{
                                    ios: 'pencil',
                                    web: 'edit',
                                }}
                                tintColor={theme.text}
                                size={18}
                            />
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    { color: theme.text },
                                ]}>
                                Edit
                            </ThemedText>
                        </Pressable>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.actionButton,
                            {
                                transform: [{ translateX: trans }],
                                backgroundColor: theme.destructive,
                            },
                        ]}>
                        <Pressable
                            style={styles.actionPressable}
                            onPress={() => {
                                swipeableRef.current?.close();
                                onDelete();
                            }}>
                            <SymbolView
                                name={{
                                    ios: 'trash',
                                    web: 'delete',
                                }}
                                tintColor={theme.background}
                                size={18}
                            />
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    { color: theme.background },
                                ]}>
                                Delete
                            </ThemedText>
                        </Pressable>
                    </Animated.View>
                </View>
            );
        };

        const assignee = members.find((u) => u.id === todo.assigneeId);

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={canManage ? renderRightActions : undefined}
                containerStyle={styles.swipeableContainer}>
                <View
                    style={[
                        styles.todoRow,
                        { borderBottomColor: `${theme.text}1A` },
                    ]}>
                    <Pressable
                        onPress={onToggle}
                        disabled={!canToggle}
                        style={({ pressed }) => [
                            styles.todoMain,
                            pressed && { opacity: 0.6 },
                        ]}>
                        <View style={styles.check}>
                            <SymbolView
                                name={{
                                    ios: todo.done
                                        ? 'checkmark.circle.fill'
                                        : 'circle',
                                    web: todo.done
                                        ? 'check_circle'
                                        : 'radio_button_unchecked',
                                }}
                                tintColor={
                                    todo.done || !canToggle
                                        ? theme.textSecondary
                                        : theme.text
                                }
                                size={19}
                            />
                        </View>

                        {/* The priority, now that no day grouping competes with it. */}
                        <View
                            style={[
                                styles.priorityBar,
                                {
                                    backgroundColor: todo.done
                                        ? theme.backgroundSelected
                                        : theme[priorityColors[todo.priority]],
                                },
                            ]}
                        />

                        <View style={styles.todoTextColumn}>
                            <ThemedText
                                type="small"
                                themeColor={
                                    todo.done ? 'textSecondary' : 'text'
                                }
                                style={todo.done && styles.strikethrough}>
                                {todo.label}
                            </ThemedText>
                            {todo.day && (
                                <ThemedText
                                    style={[
                                        styles.dueText,
                                        overdue && styles.dueOverdue,
                                        {
                                            color: overdue
                                                ? theme.priorityHigh
                                                : theme.textSecondary,
                                        },
                                    ]}>
                                    {overdue
                                        ? `${formatDaysUntil(todo.day)} · ${formatShortDateString(todo.day)}`
                                        : formatShortDateString(todo.day)}
                                </ThemedText>
                            )}
                        </View>
                    </Pressable>

                    {(canManage || assignee) && (
                        <Pressable
                            onPress={onAssign}
                            disabled={!canManage}
                            accessibilityLabel={
                                assignee
                                    ? `Assigned to ${assignee.name}. Change assignee`
                                    : 'Assign task'
                            }
                            accessibilityRole="button"
                            style={styles.assigneeBadgeContainer}>
                            <MemberAvatar member={assignee ?? null} size={26} />
                        </Pressable>
                    )}
                </View>
            </Swipeable>
        );
    }
);

TodoRow.displayName = 'TodoRow';

export default function TodoScreen() {
    const theme = useTheme();
    const {
        todos,
        loading,
        error,
        clearError,
        addTodo,
        toggleTodo,
        editTodo,
        deleteTodo,
        assignTodo,
    } = useTodos();
    const { members } = useMembers();
    const { canManageContent, canToggle } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [assigningTodoId, setAssigningTodoId] = useState<string | null>(null);
    const assigningTodo = todos.find((one) => one.id === assigningTodoId);
    const [showingCompleted, setShowingCompleted] = useState(false);
    const [sort, setSort] = useState<TodoSort>('urgency');
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    const [todoText, setTodoText] = useState('');
    const [todoPriority, setTodoPriority] =
        useState<TodoItem['priority']>('medium');
    const [todoAssigneeId, setTodoAssigneeId] = useState<string | undefined>(
        undefined
    );
    const [todoDay, setTodoDay] = useState<string | null>(null);

    const todayStr = getRelativeDateString(0);

    const outstanding = sortTodos(
        todos.filter((t) => !t.done),
        sort,
        members.map((member) => member.id)
    );
    /** Finished work is its own order, most recently done first. */
    const completed = todos.filter((t) => t.done).sort(byCompletion);
    const progress =
        todos.length > 0
            ? Math.round((completed.length / todos.length) * 100)
            : 0;

    const openAddModal = () => {
        setEditingTodo(null);
        setTodoText('');
        setTodoPriority('medium');
        setTodoDay(null);
        setTodoAssigneeId(undefined);
        clearError();
        setModalVisible(true);
    };

    const openEditModal = (todo: TodoItem) => {
        setEditingTodo(todo);
        setTodoText(todo.label);
        setTodoPriority(todo.priority);
        setTodoDay(todo.day);
        setTodoAssigneeId(todo.assigneeId ?? undefined);
        clearError();
        setModalVisible(true);
    };

    const saveTodo = async () => {
        if (!todoText.trim()) return;

        const saved = editingTodo
            ? await editTodo(
                  editingTodo.id,
                  todoText.trim(),
                  todoPriority,
                  todoDay,
                  todoAssigneeId
              )
            : await addTodo(
                  todoText.trim(),
                  todoPriority,
                  todoDay,
                  todoAssigneeId
              );

        if (saved) setModalVisible(false);
    };

    const closeModal = () => {
        clearError();
        setModalVisible(false);
    };

    const renderRow = (todo: TodoItem) => (
        <TodoRow
            key={todo.id}
            todo={todo}
            theme={theme}
            overdue={!todo.done && !!todo.day && todo.day < todayStr}
            canManage={canManageContent}
            canToggle={canToggle(todo.assigneeId)}
            onToggle={() => toggleTodo(todo.id)}
            onEdit={() => openEditModal(todo)}
            onDelete={() => deleteTodo(todo.id)}
            onAssign={() => setAssigningTodoId(todo.id)}
        />
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="title">To-do</ThemedText>
                    <View style={styles.summary}>
                        <ThemedText type="figure" themeColor="textSecondary">
                            {completed.length}
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.summaryText}>
                            of {todos.length} completed in total
                        </ThemedText>
                    </View>
                    {todos.length > 0 && (
                        <View
                            style={[
                                styles.progressTrack,
                                { backgroundColor: `${theme.text}29` },
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
                    )}
                </View>

                {error && (
                    <ThemedText
                        type="small"
                        style={[styles.error, { color: theme.destructive }]}>
                        {error}
                    </ThemedText>
                )}

                {/* Only worth offering once there is a list to arrange. */}
                {outstanding.length > 1 && (
                    <View
                        style={[
                            styles.sortRow,
                            { borderBottomColor: `${theme.text}24` },
                        ]}>
                        {TODO_SORTS.map(({ key, label }) => {
                            const isSelected = sort === key;
                            return (
                                <Pressable
                                    key={key}
                                    onPress={() => setSort(key)}
                                    accessibilityLabel={`Sort by ${label.toLowerCase()}`}
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        selected: isSelected,
                                    }}
                                    style={styles.sortTab}>
                                    <ThemedText
                                        type="label"
                                        themeColor={
                                            isSelected
                                                ? 'text'
                                                : 'textSecondary'
                                        }>
                                        {label}
                                    </ThemedText>
                                    <View
                                        style={[
                                            styles.sortMark,
                                            isSelected && {
                                                backgroundColor: theme.text,
                                            },
                                        ]}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {outstanding.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.emptyText}>
                            {loading
                                ? ''
                                : todos.length === 0
                                  ? 'Nothing to do yet.'
                                  : 'Everything is done.'}
                        </ThemedText>
                    ) : (
                        <View>{outstanding.map(renderRow)}</View>
                    )}

                    {/* Done, out of the way but not out of reach. */}
                    {completed.length > 0 && (
                        <>
                            <Pressable
                                onPress={() =>
                                    setShowingCompleted((shown) => !shown)
                                }
                                accessibilityRole="button"
                                accessibilityState={{
                                    expanded: showingCompleted,
                                }}
                                style={({ pressed }) => [
                                    styles.showCompletedRow,
                                    pressed && { opacity: 0.6 },
                                ]}>
                                <SymbolView
                                    name={{
                                        ios: showingCompleted
                                            ? 'chevron.down'
                                            : 'chevron.right',
                                        web: showingCompleted
                                            ? 'expand_less'
                                            : 'expand_more',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={14}
                                />
                                <ThemedText
                                    themeColor="textSecondary"
                                    type="label">
                                    {showingCompleted ? 'Hide' : 'Show'}{' '}
                                    {completed.length} completed
                                </ThemedText>
                            </Pressable>

                            {showingCompleted && (
                                <View>{completed.map(renderRow)}</View>
                            )}
                        </>
                    )}
                </ScrollView>

                {/* Add todo button */}
                {canManageContent && (
                    <View style={styles.addButtonContainer}>
                        <Pressable
                            onPress={openAddModal}
                            accessibilityLabel="Add task"
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.addButton,
                                { backgroundColor: theme.text },
                                pressed && { opacity: 0.8 },
                            ]}>
                            <ThemedText
                                style={[
                                    styles.addButtonText,
                                    { color: theme.background },
                                ]}>
                                Add task
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>

            {/* Modal dialog */}
            <FormSheet
                visible={modalVisible}
                title={editingTodo ? 'Edit task' : 'Add a task'}
                onClose={closeModal}
                actionLabel="Save"
                onAction={saveTodo}
                actionDisabled={!todoText.trim()}
                error={error}>
                <FormField
                    label="Task description"
                    placeholder="Describe the task..."
                    value={todoText}
                    onChangeText={setTodoText}
                />
                <OptionTabs
                    label="Priority"
                    options={PRIORITIES.map((one) => ({
                        ...one,
                        color: theme[priorityColors[one.key]],
                    }))}
                    chosen={todoPriority}
                    onChoose={setTodoPriority}
                />

                {/* Due date, which a task need not have. */}
                <DateRow
                    label="Due date"
                    day={todoDay}
                    onChange={setTodoDay}
                    onClear={() => setTodoDay(null)}
                />
                <MemberPicker
                    label="Assignee"
                    chosenId={todoAssigneeId}
                    onChoose={setTodoAssigneeId}
                    noneLabel="Unassigned"
                />
            </FormSheet>

            <ChoiceCard
                visible={assigningTodoId !== null}
                title="Assign task"
                onClose={() => setAssigningTodoId(null)}>
                <MemberPicker
                    chosenId={assigningTodo?.assigneeId ?? undefined}
                    noneLabel="Unassigned"
                    onChoose={(memberId) => {
                        if (assigningTodoId) {
                            assignTodo(assigningTodoId, memberId);
                        }
                        setAssigningTodoId(null);
                    }}
                />
            </ChoiceCard>
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
    },
    header: {
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.two,
        marginTop: Spacing.two,
    },
    summaryText: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    progressTrack: {
        height: 2,
        overflow: 'hidden',
        marginTop: Spacing.three,
    },
    progressFill: {
        height: '100%',
    },
    error: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
    },

    /* ── How the list is gathered ── */
    sortRow: {
        flexDirection: 'row',
        gap: Spacing.four,
        paddingHorizontal: Spacing.four,
        borderBottomWidth: 1,
    },
    sortTab: {
        alignItems: 'center',
    },
    /** The mark under the order the list is in. */
    sortMark: {
        height: 2,
        alignSelf: 'stretch',
        marginTop: Spacing.two + Spacing.one,
    },
    emptyText: {
        paddingVertical: Spacing.three,
    },

    // The list
    swipeableContainer: {
        overflow: 'hidden',
    },
    todoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
    },
    priorityBar: {
        width: 3,
        alignSelf: 'stretch',
        marginTop: Spacing.half / 2,
    },
    todoMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
    },
    /** Nudged onto the title's baseline rather than its line box. */
    check: {
        paddingTop: Spacing.half,
    },
    todoTextColumn: {
        flex: 1,
        gap: Spacing.one + Spacing.half / 2,
    },
    dueText: {
        fontFamily: Fonts.sansMedium,
        fontSize: 11,
        lineHeight: 15,
    },
    dueOverdue: {
        fontFamily: Fonts.sansSemiBold,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    assigneeBadgeContainer: {
        paddingTop: Spacing.three,
        paddingLeft: Spacing.three,
    },
    showCompletedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.four,
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        /** Outside the scroll view, so it clears the floating tab bar itself. */
        paddingBottom: BottomTabInset + Spacing.three,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: Spacing.three,
    },
    addButtonText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 13.5,
        lineHeight: 18,
    },

    // Swipeable Actions
    rightActionsContainer: {
        width: 160,
        flexDirection: 'row',
    },
    actionButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.half,
    },
    actionText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        lineHeight: 15,
    },
});
