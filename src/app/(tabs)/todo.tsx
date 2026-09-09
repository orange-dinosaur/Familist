import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import React, { useState, useRef } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatePickerModal } from '@/components/date-picker-modal';
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
    Colors,
    Fonts,
    MaxContentWidth,
    Spacing,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
                                tintColor={Colors.light.background}
                                size={18}
                            />
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    { color: Colors.light.background },
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
    const scheme = useColorScheme();
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
    const [datePickerVisible, setDatePickerVisible] = useState(false);

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
        setDatePickerVisible(false);
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
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeModal}>
                <View
                    style={[
                        styles.modalContainer,
                        { backgroundColor: theme.background },
                    ]}>
                    <SafeAreaView style={styles.modalSafeArea}>
                        {/* Modal header */}
                        <View style={styles.modalHeader}>
                            <ThemedText type="subtitle">
                                {editingTodo ? 'Edit Task' : 'Add Task'}
                            </ThemedText>
                            <Pressable
                                onPress={closeModal}
                                hitSlop={8}
                                accessibilityLabel="Close"
                                accessibilityRole="button">
                                <SymbolView
                                    name={{
                                        ios: 'xmark.circle.fill',
                                        web: 'cancel',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={28}
                                />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled">
                            {/* Label Input */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Task description
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor:
                                            theme.backgroundElement,
                                        color: theme.text,
                                    },
                                ]}
                                placeholder="Describe the task..."
                                placeholderTextColor={theme.textSecondary}
                                value={todoText}
                                onChangeText={setTodoText}
                                accessibilityLabel="Task description"
                            />

                            {/* Priority Selection */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Priority
                            </ThemedText>
                            <View style={styles.priorityGrid}>
                                {(['low', 'medium', 'high'] as const).map(
                                    (p) => {
                                        const isSelected = todoPriority === p;
                                        const priorityConfig = {
                                            low: {
                                                color: theme.priorityLow,
                                                label: 'Low',
                                            },
                                            medium: {
                                                color: theme.priorityMedium,
                                                label: 'Medium',
                                            },
                                            high: {
                                                color: theme.priorityHigh,
                                                label: 'High',
                                            },
                                        };
                                        return (
                                            <Pressable
                                                key={p}
                                                onPress={() =>
                                                    setTodoPriority(p)
                                                }
                                                accessibilityLabel={`Select priority ${p}`}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    selected: isSelected,
                                                }}
                                                style={[
                                                    styles.priorityCard,
                                                    {
                                                        backgroundColor:
                                                            isSelected
                                                                ? theme.backgroundSelected
                                                                : theme.backgroundElement,
                                                        borderColor: isSelected
                                                            ? priorityConfig[p]
                                                                  .color
                                                            : 'transparent',
                                                    },
                                                ]}>
                                                <View
                                                    style={[
                                                        styles.priorityDot,
                                                        {
                                                            backgroundColor:
                                                                priorityConfig[
                                                                    p
                                                                ].color,
                                                        },
                                                    ]}
                                                />
                                                <ThemedText
                                                    type="small"
                                                    style={
                                                        styles.priorityLabel
                                                    }>
                                                    {priorityConfig[p].label}
                                                </ThemedText>
                                            </Pressable>
                                        );
                                    }
                                )}
                            </View>

                            {/* Due date, which a task need not have. */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Due date
                            </ThemedText>
                            <View style={styles.dayPillsContainer}>
                                <Pressable
                                    onPress={() => setTodoDay(null)}
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        selected: todoDay === null,
                                    }}
                                    style={[
                                        styles.dayPill,
                                        {
                                            backgroundColor:
                                                todoDay === null
                                                    ? theme.text
                                                    : theme.backgroundElement,
                                        },
                                    ]}>
                                    <ThemedText
                                        style={[
                                            styles.dayPillText,
                                            {
                                                color:
                                                    todoDay === null
                                                        ? theme.background
                                                        : theme.text,
                                            },
                                        ]}>
                                        No date
                                    </ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={() => setDatePickerVisible(true)}
                                    accessibilityLabel="Pick a due date"
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        selected: todoDay !== null,
                                    }}
                                    style={[
                                        styles.dayPill,
                                        {
                                            backgroundColor:
                                                todoDay !== null
                                                    ? theme.text
                                                    : theme.backgroundElement,
                                        },
                                    ]}>
                                    <SymbolView
                                        name={{
                                            ios: 'calendar',
                                            web: 'calendar_month',
                                        }}
                                        tintColor={
                                            todoDay !== null
                                                ? theme.background
                                                : theme.text
                                        }
                                        size={18}
                                    />
                                    <ThemedText
                                        style={[
                                            styles.dayPillText,
                                            {
                                                color:
                                                    todoDay !== null
                                                        ? theme.background
                                                        : theme.text,
                                            },
                                        ]}>
                                        {todoDay
                                            ? formatShortDateString(todoDay)
                                            : 'Pick a date'}
                                    </ThemedText>
                                </Pressable>
                            </View>

                            {/* Assignee Selection */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Assignee
                            </ThemedText>
                            <View style={styles.assigneeList}>
                                {members.map((user) => {
                                    const isSelected =
                                        todoAssigneeId === user.id;
                                    return (
                                        <Pressable
                                            key={user.id}
                                            onPress={() =>
                                                setTodoAssigneeId(
                                                    isSelected
                                                        ? undefined
                                                        : user.id
                                                )
                                            }
                                            accessibilityLabel={`Assign to ${user.name}`}
                                            accessibilityRole="button"
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                            style={[
                                                styles.editAssigneeRow,
                                                {
                                                    backgroundColor:
                                                        theme.backgroundElement,
                                                    borderColor: isSelected
                                                        ? theme.text
                                                        : 'transparent',
                                                },
                                            ]}>
                                            <MemberAvatar
                                                member={user}
                                                size={32}
                                            />
                                            <ThemedText
                                                style={styles.editAssigneeName}>
                                                {user.name}
                                            </ThemedText>
                                            {isSelected && (
                                                <SymbolView
                                                    name={{
                                                        ios: 'checkmark.circle.fill',
                                                        web: 'check_circle',
                                                    }}
                                                    tintColor={theme.text}
                                                    size={22}
                                                />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Save Button */}
                        <View style={styles.modalFooter}>
                            {error && (
                                <ThemedText
                                    type="small"
                                    style={{ color: theme.destructive }}>
                                    {error}
                                </ThemedText>
                            )}
                            <Pressable
                                onPress={saveTodo}
                                disabled={!todoText.trim()}
                                accessibilityLabel="Save task"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.saveButton,
                                    {
                                        backgroundColor: todoText.trim()
                                            ? theme.text
                                            : theme.backgroundElement,
                                    },
                                    pressed && {
                                        opacity: 0.8,
                                    },
                                ]}>
                                <ThemedText
                                    style={[
                                        styles.saveButtonText,
                                        {
                                            color: todoText.trim()
                                                ? theme.background
                                                : theme.textSecondary,
                                        },
                                    ]}>
                                    Save
                                </ThemedText>
                            </Pressable>
                        </View>

                        <DatePickerModal
                            visible={datePickerVisible}
                            value={todoDay}
                            onSelect={(day) => {
                                setTodoDay(day);
                                setDatePickerVisible(false);
                            }}
                            onClose={() => setDatePickerVisible(false)}
                        />
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Assignee Selection Modal */}
            <Modal
                visible={assigningTodoId !== null}
                animationType="none"
                transparent={true}
                onRequestClose={() => setAssigningTodoId(null)}>
                <BlurView
                    intensity={40}
                    tint={scheme === 'dark' ? 'dark' : 'light'}
                    experimentalBlurMethod="dimezisBlurView"
                    style={styles.modalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setAssigningTodoId(null)}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.assigneeModalContent,
                            { backgroundColor: theme.background },
                        ]}>
                        <ThemedText
                            type="subtitle"
                            style={styles.assigneeModalTitle}>
                            Assign Task
                        </ThemedText>

                        <ScrollView
                            style={styles.assigneeList}
                            showsVerticalScrollIndicator={false}>
                            {members.map((member) => (
                                <Pressable
                                    key={member.id}
                                    onPress={() => {
                                        if (assigningTodoId) {
                                            assignTodo(
                                                assigningTodoId,
                                                member.id
                                            );
                                        }
                                        setAssigningTodoId(null);
                                    }}
                                    style={({ pressed }) => [
                                        styles.assigneeRow,
                                        pressed && {
                                            backgroundColor:
                                                theme.backgroundSelected,
                                        },
                                    ]}>
                                    <MemberAvatar member={member} size={40} />
                                    <ThemedText style={styles.assigneeName}>
                                        {member.name}
                                    </ThemedText>
                                </Pressable>
                            ))}

                            <Pressable
                                onPress={() => {
                                    if (assigningTodoId) {
                                        assignTodo(assigningTodoId, undefined);
                                    }
                                    setAssigningTodoId(null);
                                }}
                                style={({ pressed }) => [
                                    styles.assigneeRow,
                                    pressed && {
                                        backgroundColor:
                                            theme.backgroundSelected,
                                    },
                                ]}>
                                <MemberAvatar member={null} size={40} />
                                <ThemedText
                                    themeColor="textSecondary"
                                    style={styles.assigneeName}>
                                    Unassigned
                                </ThemedText>
                            </Pressable>
                        </ScrollView>

                        <Pressable
                            onPress={() => setAssigningTodoId(null)}
                            style={[
                                styles.assigneeCloseButton,
                                { backgroundColor: theme.backgroundElement },
                            ]}>
                            <ThemedText style={{ fontWeight: '600' }}>
                                Cancel
                            </ThemedText>
                        </Pressable>
                    </View>
                </BlurView>
            </Modal>
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

    // Priority Dot
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // Modal
    modalContainer: {
        flex: 1,
    },
    modalSafeArea: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two,
    },
    modalScroll: {
        flex: 1,
    },
    modalScrollContent: {
        paddingHorizontal: Spacing.four,
        gap: Spacing.three,
        paddingBottom: Spacing.four,
    },
    modalLabel: {
        fontWeight: '600',
    },
    textInput: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
    },
    priorityGrid: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    priorityCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: Spacing.two + Spacing.half,
    },
    priorityLabel: {
        fontWeight: '600',
    },

    // Due date pills in modal
    dayPillsContainer: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    dayPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + Spacing.half,
        borderRadius: 20,
    },
    dayPillText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Assignee rows in modal
    assigneeList: {
        gap: Spacing.two,
    },
    assigneeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.two,
        borderRadius: 14,
    },
    editAssigneeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: 12,
        borderWidth: 2,
    },
    editAssigneeName: {
        fontSize: 16,
        fontWeight: '500',
    },
    assigneeName: {
        fontSize: 16,
        fontWeight: '500',
    },
    assigneeModalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: Spacing.four,
        gap: Spacing.three,
    },
    assigneeModalTitle: {
        fontWeight: '700',
        textAlign: 'center',
    },
    assigneeCloseButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.three,
        borderRadius: 14,
        marginTop: Spacing.one,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
    },

    // Modal footer
    modalFooter: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        gap: Spacing.two,
    },
    saveButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        padding: Spacing.three,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
