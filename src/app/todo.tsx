import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    type TodoItem,
    MOCK_USERS,
    getDateRange,
    formatLocalDateString,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';

interface TodoRowProps {
    todo: TodoItem;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const TodoRow = React.memo(
    ({ todo, onToggle, onEdit, onDelete, theme }: TodoRowProps) => {
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
                            styles.editButton,
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
                                style={{
                                    color: theme.text,
                                    fontSize: 11,
                                    fontWeight: '600',
                                }}>
                                Edit
                            </ThemedText>
                        </Pressable>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.actionButton,
                            styles.deleteButton,
                            { transform: [{ translateX: trans }] },
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
                                tintColor="#ffffff"
                                size={18}
                            />
                            <ThemedText style={styles.actionText}>
                                Delete
                            </ThemedText>
                        </Pressable>
                    </Animated.View>
                </View>
            );
        };

        const assignee = MOCK_USERS.find((u) => u.id === todo.assigneeId);
        const priorityColors = {
            low: '#4CAF50',
            medium: '#FF9800',
            high: '#F44336',
        };

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={renderRightActions}
                containerStyle={styles.swipeableContainer}>
                <Pressable
                    onPress={onToggle}
                    style={({ pressed }) => [
                        styles.todoRow,
                        {
                            backgroundColor: theme.backgroundElement,
                        },
                        pressed && {
                            backgroundColor: theme.backgroundSelected,
                        },
                    ]}>
                    <SymbolView
                        name={{
                            ios: todo.done ? 'checkmark.circle.fill' : 'circle',
                            web: todo.done
                                ? 'check_circle'
                                : 'radio_button_unchecked',
                        }}
                        tintColor={todo.done ? theme.textSecondary : theme.text}
                        size={22}
                    />

                    <View style={styles.todoDetails}>
                        <ThemedText
                            type="default"
                            themeColor={todo.done ? 'textSecondary' : 'text'}
                            style={[
                                styles.todoLabel,
                                todo.done && styles.strikethrough,
                            ]}>
                            {todo.label}
                        </ThemedText>

                        <View style={styles.metaRow}>
                            <View
                                style={[
                                    styles.priorityBadge,
                                    {
                                        backgroundColor:
                                            priorityColors[todo.priority] +
                                            '20',
                                    },
                                ]}>
                                <View
                                    style={[
                                        styles.priorityDot,
                                        {
                                            backgroundColor:
                                                priorityColors[todo.priority],
                                        },
                                    ]}
                                />
                                <ThemedText
                                    type="small"
                                    style={[
                                        styles.priorityText,
                                        {
                                            color: priorityColors[
                                                todo.priority
                                            ],
                                        },
                                    ]}>
                                    {todo.priority.charAt(0).toUpperCase() +
                                        todo.priority.slice(1)}
                                </ThemedText>
                            </View>

                            {assignee && (
                                <View
                                    style={[
                                        styles.assigneeBadge,
                                        {
                                            backgroundColor:
                                                theme.backgroundSelected,
                                        },
                                    ]}>
                                    <View
                                        style={[
                                            styles.assigneeAvatar,
                                            { backgroundColor: assignee.color },
                                        ]}>
                                        <ThemedText
                                            style={styles.assigneeInitials}>
                                            {assignee.initials}
                                        </ThemedText>
                                    </View>
                                    <ThemedText
                                        type="small"
                                        themeColor="textSecondary">
                                        {assignee.name}
                                    </ThemedText>
                                </View>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Swipeable>
        );
    }
);

TodoRow.displayName = 'TodoRow';

export default function TodoScreen() {
    const theme = useTheme();
    const { todos, addTodo, toggleTodo, editTodo, deleteTodo } = useTodos();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    const [todoText, setTodoText] = useState('');
    const [todoPriority, setTodoPriority] =
        useState<TodoItem['priority']>('medium');
    const [todoAssigneeId, setTodoAssigneeId] = useState<string | undefined>(
        undefined
    );

    const scrollViewRef = useRef<ScrollView>(null);
    const todayYOffsetRef = useRef<number | null>(null);
    const todayStr = getRelativeDateString(0);
    const [todoDay, setTodoDay] = useState<string>(todayStr);

    const dates = getDateRange();
    const activeTodos = todos.filter((t) => !t.done);
    const completedTodos = todos.filter((t) => t.done);

    useFocusEffect(
        React.useCallback(() => {
            if (todayYOffsetRef.current !== null) {
                scrollViewRef.current?.scrollTo({
                    y: todayYOffsetRef.current - Spacing.four,
                    animated: false,
                });
            }
        }, [])
    );

    const openAddModal = () => {
        setEditingTodo(null);
        setTodoText('');
        setTodoPriority('medium');
        setTodoDay(todayStr);
        setTodoAssigneeId(undefined);
        setModalVisible(true);
    };

    const openAddModalForDay = (day: string) => {
        setEditingTodo(null);
        setTodoText('');
        setTodoPriority('medium');
        setTodoDay(day);
        setTodoAssigneeId(undefined);
        setModalVisible(true);
    };

    const openEditModal = (todo: TodoItem) => {
        setEditingTodo(todo);
        setTodoText(todo.label);
        setTodoPriority(todo.priority);
        setTodoDay(todo.day);
        setTodoAssigneeId(todo.assigneeId);
        setModalVisible(true);
    };

    const saveTodo = () => {
        if (!todoText.trim()) return;

        if (editingTodo) {
            editTodo(
                editingTodo.id,
                todoText.trim(),
                todoPriority,
                todoDay,
                todoAssigneeId
            );
        } else {
            addTodo(todoText.trim(), todoPriority, todoDay, todoAssigneeId);
        }
        setModalVisible(false);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <ThemedText type="title" style={styles.pageTitle}>
                            To-Do List
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {activeTodos.length} active, {completedTodos.length}{' '}
                            completed in total
                        </ThemedText>
                    </View>

                    {/* Todos grouped by day */}
                    {dates.map((day) => {
                        const dayTodos = todos.filter((t) => t.day === day);
                        const dayActive = dayTodos.filter((t) => !t.done);
                        const dayCompleted = dayTodos.filter((t) => t.done);
                        const isToday = day === todayStr;

                        return (
                            <View
                                key={day}
                                onLayout={(event) => {
                                    if (isToday) {
                                        const y = event.nativeEvent.layout.y;
                                        todayYOffsetRef.current = y;
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollTo({
                                                y: y - Spacing.four,
                                                animated: false,
                                            });
                                        }, 100);
                                    }
                                }}
                                style={[
                                    styles.dayCard,
                                    {
                                        backgroundColor:
                                            theme.backgroundElement,
                                    },
                                    isToday && styles.todayCard,
                                    isToday && { borderColor: theme.text },
                                ]}>
                                {/* Day Card Header */}
                                <View style={styles.dayCardHeader}>
                                    <View style={styles.dayCardTitleRow}>
                                        <ThemedText
                                            type="subtitle"
                                            style={styles.dayCardTitle}>
                                            {formatLocalDateString(day)}
                                        </ThemedText>
                                        {dayActive.length > 0 && (
                                            <ThemedText
                                                themeColor="textSecondary"
                                                type="small"
                                                style={styles.dayProgressText}>
                                                • {dayActive.length} active
                                            </ThemedText>
                                        )}
                                        {isToday && (
                                            <View
                                                style={[
                                                    styles.todayBadge,
                                                    {
                                                        backgroundColor:
                                                            theme.text,
                                                    },
                                                ]}>
                                                <ThemedText
                                                    style={[
                                                        styles.todayBadgeText,
                                                        {
                                                            color: theme.background,
                                                        },
                                                    ]}>
                                                    Today
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    <Pressable
                                        onPress={() => openAddModalForDay(day)}
                                        accessibilityLabel={`Add todo for ${formatLocalDateString(day)}`}
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.dayAddButton,
                                            pressed && { opacity: 0.7 },
                                        ]}>
                                        <SymbolView
                                            name={{
                                                ios: 'plus.circle.fill',
                                                web: 'add_circle',
                                            }}
                                            tintColor={theme.text}
                                            size={22}
                                        />
                                    </Pressable>
                                </View>

                                {/* Day Todo Content */}
                                {dayTodos.length === 0 ? (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small"
                                        style={styles.noTodosText}>
                                        No tasks planned for this day.
                                    </ThemedText>
                                ) : (
                                    <View style={styles.todoSections}>
                                        {/* Active Tasks */}
                                        {dayActive.length > 0 && (
                                            <View style={styles.taskSection}>
                                                {dayActive.map((todo) => (
                                                    <TodoRow
                                                        key={todo.id}
                                                        todo={todo}
                                                        theme={theme}
                                                        onToggle={() =>
                                                            toggleTodo(todo.id)
                                                        }
                                                        onEdit={() =>
                                                            openEditModal(todo)
                                                        }
                                                        onDelete={() =>
                                                            deleteTodo(todo.id)
                                                        }
                                                    />
                                                ))}
                                            </View>
                                        )}

                                        {/* Completed Tasks */}
                                        {dayCompleted.length > 0 && (
                                            <View style={styles.taskSection}>
                                                <ThemedText
                                                    type="small"
                                                    themeColor="textSecondary"
                                                    style={
                                                        styles.completedHeader
                                                    }>
                                                    Completed
                                                </ThemedText>
                                                {dayCompleted.map((todo) => (
                                                    <TodoRow
                                                        key={todo.id}
                                                        todo={todo}
                                                        theme={theme}
                                                        onToggle={() =>
                                                            toggleTodo(todo.id)
                                                        }
                                                        onEdit={() =>
                                                            openEditModal(todo)
                                                        }
                                                        onDelete={() =>
                                                            deleteTodo(todo.id)
                                                        }
                                                    />
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Add todo button */}
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
                        <SymbolView
                            name={{
                                ios: 'plus',
                                web: 'add',
                            }}
                            tintColor={theme.background}
                            size={20}
                        />
                        <ThemedText
                            style={[
                                styles.addButtonText,
                                { color: theme.background },
                            ]}>
                            Add Task
                        </ThemedText>
                    </Pressable>
                </View>
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
                            {/* Step 1: Choose Day */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Choose day
                            </ThemedText>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.dayPillsScrollView}
                                contentContainerStyle={
                                    styles.dayPillsContainer
                                }>
                                {dates.map((day) => {
                                    const isSelected = todoDay === day;
                                    return (
                                        <Pressable
                                            key={day}
                                            onPress={() => setTodoDay(day)}
                                            style={[
                                                styles.dayPill,
                                                {
                                                    backgroundColor: isSelected
                                                        ? theme.text
                                                        : theme.backgroundElement,
                                                    borderColor: isSelected
                                                        ? theme.text
                                                        : 'transparent',
                                                },
                                            ]}>
                                            <ThemedText
                                                style={[
                                                    styles.dayPillText,
                                                    {
                                                        color: isSelected
                                                            ? theme.background
                                                            : theme.text,
                                                    },
                                                ]}>
                                                {formatShortDateString(day)}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

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
                                                color: '#4CAF50',
                                                label: 'Low',
                                            },
                                            medium: {
                                                color: '#FF9800',
                                                label: 'Medium',
                                            },
                                            high: {
                                                color: '#F44336',
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

                            {/* Assignee Selection */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Assignee
                            </ThemedText>
                            <View style={styles.assigneeList}>
                                {MOCK_USERS.map((user) => {
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
                                                styles.assigneeRow,
                                                {
                                                    backgroundColor:
                                                        theme.backgroundElement,
                                                    borderColor: isSelected
                                                        ? theme.text
                                                        : 'transparent',
                                                },
                                            ]}>
                                            <View
                                                style={[
                                                    styles.assigneeAvatarLarge,
                                                    {
                                                        backgroundColor:
                                                            user.color,
                                                    },
                                                ]}>
                                                <ThemedText
                                                    style={
                                                        styles.assigneeInitialsLarge
                                                    }>
                                                    {user.initials}
                                                </ThemedText>
                                            </View>
                                            <ThemedText
                                                style={styles.assigneeName}>
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
                    </SafeAreaView>
                </View>
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
        paddingBottom: BottomTabInset + Spacing.six,
        gap: Spacing.three,
    },
    header: {
        paddingTop: Spacing.two,
        gap: Spacing.one,
        marginBottom: Spacing.one,
    },
    pageTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    subtitle: {
        marginTop: -Spacing.one,
    },

    // Day card styles
    dayCard: {
        borderRadius: 16,
        padding: Spacing.three,
        gap: Spacing.two,
    },
    todayCard: {
        borderWidth: 1.5,
    },
    dayCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: Spacing.half,
    },
    dayCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    dayCardTitle: {
        fontWeight: '700',
    },
    dayProgressText: {
        fontWeight: '500',
    },
    todayBadge: {
        borderRadius: 6,
        paddingHorizontal: Spacing.one + Spacing.half,
        paddingVertical: Spacing.half / 2,
    },
    todayBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dayAddButton: {
        padding: Spacing.half,
    },
    noTodosText: {
        fontStyle: 'italic',
        paddingVertical: Spacing.half,
    },
    todoSections: {
        gap: Spacing.three,
    },
    taskSection: {
        gap: Spacing.two,
    },
    completedHeader: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: Spacing.one,
        marginBottom: Spacing.half,
    },

    swipeableContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    todoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.three,
        padding: Spacing.three,
    },
    todoDetails: {
        flex: 1,
        gap: Spacing.one,
    },
    todoLabel: {
        fontSize: 16,
        lineHeight: 22,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: Spacing.two,
    },

    // Priority Dot
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.half,
        borderRadius: 6,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Assignee styling
    assigneeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingHorizontal: Spacing.one + Spacing.half,
        paddingVertical: Spacing.half,
        borderRadius: 12,
    },
    assigneeAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeInitials: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '700',
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Platform.select({ ios: 0, default: Spacing.three }),
        marginBottom: Platform.select({ ios: Spacing.four, default: 0 }),
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        borderRadius: 14,
        padding: Spacing.three,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
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

    // Day pills selector in modal
    dayPillsScrollView: {
        marginBottom: Spacing.two,
    },
    dayPillsContainer: {
        gap: Spacing.one + Spacing.half,
        paddingVertical: Spacing.half,
    },
    dayPill: {
        paddingHorizontal: Spacing.three + Spacing.half,
        paddingVertical: Spacing.two,
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
        padding: Spacing.three,
        borderRadius: 12,
        borderWidth: 2,
    },
    assigneeAvatarLarge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeInitialsLarge: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    assigneeName: {
        flex: 1,
        fontWeight: '500',
    },

    // Modal footer
    modalFooter: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
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
    editButton: {
        // color handled in style prop
    },
    deleteButton: {
        backgroundColor: '#E5484D',
    },
    actionPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.half,
    },
    actionText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },
});
