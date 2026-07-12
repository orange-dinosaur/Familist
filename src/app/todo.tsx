import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
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
import { type TodoItem, MOCK_USERS } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTodos } from '@/hooks/use-todos';

const priorityConfig: Record<
    TodoItem['priority'],
    { label: string; color: string }
> = {
    high: { label: 'High', color: '#E5484D' },
    medium: { label: 'Med', color: '#F5A623' },
    low: { label: 'Low', color: '#46A758' },
};

const PRIORITIES: TodoItem['priority'][] = ['low', 'medium', 'high'];

interface TodoRowProps {
    todo: TodoItem;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const TodoRow = React.memo(
    ({ todo, onToggle, onEdit, onDelete, theme }: TodoRowProps) => {
        const swipeableRef = React.useRef<Swipeable>(null);

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
                            { transform: [{ translateX: trans }] },
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
                                tintColor="#ffffff"
                                size={18}
                            />
                            <ThemedText style={styles.actionText}>
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
                    <View style={styles.todoContent}>
                        <ThemedText
                            type="default"
                            themeColor={todo.done ? 'textSecondary' : 'text'}
                            style={[
                                styles.todoLabel,
                                todo.done && styles.strikethrough,
                            ]}>
                            {todo.label}
                        </ThemedText>
                    </View>

                    {/* Assignee Avatar Badge */}
                    {assignee && (
                        <View
                            style={[
                                styles.assigneeAvatar,
                                { backgroundColor: assignee.color },
                            ]}>
                            <ThemedText style={styles.assigneeInitials}>
                                {assignee.initials}
                            </ThemedText>
                        </View>
                    )}

                    {!todo.done && (
                        <View
                            style={[
                                styles.priorityBadge,
                                {
                                    backgroundColor:
                                        priorityConfig[todo.priority].color +
                                        '20',
                                    marginLeft: Spacing.one,
                                },
                            ]}>
                            <ThemedText
                                type="small"
                                style={{
                                    color: priorityConfig[todo.priority].color,
                                    fontWeight: '600',
                                }}>
                                {priorityConfig[todo.priority].label}
                            </ThemedText>
                        </View>
                    )}
                </Pressable>
            </Swipeable>
        );
    }
);

TodoRow.displayName = 'TodoRow';

export default function TodoScreen() {
    const theme = useTheme();
    const { todos, addTodo, toggleTodo, deleteTodo, editTodo } = useTodos();
    const [modalVisible, setModalVisible] = useState(false);
    const [todoText, setTodoText] = useState('');
    const [todoPriority, setTodoPriority] =
        useState<TodoItem['priority']>('medium');
    const [todoAssigneeId, setTodoAssigneeId] = useState<string | undefined>(
        undefined
    );
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    const activeTodos = todos.filter((t) => !t.done);
    const completedTodos = todos.filter((t) => t.done);
    const hasTodos = todos.length > 0;

    const openAddModal = () => {
        setEditingTodo(null);
        setTodoText('');
        setTodoPriority('medium');
        setTodoAssigneeId(undefined);
        setModalVisible(true);
    };

    const openEditModal = (todo: TodoItem) => {
        setEditingTodo(todo);
        setTodoText(todo.label);
        setTodoPriority(todo.priority);
        setTodoAssigneeId(todo.assigneeId);
        setModalVisible(true);
    };

    const handleSave = () => {
        if (!todoText.trim()) return;

        if (editingTodo) {
            editTodo(
                editingTodo.id,
                todoText.trim(),
                todoPriority,
                todoAssigneeId
            );
        } else {
            addTodo(todoText.trim(), todoPriority, todoAssigneeId);
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
                            completed
                        </ThemedText>
                    </View>

                    {/* Active Section */}
                    {activeTodos.length > 0 && (
                        <>
                            <ThemedText
                                themeColor="textSecondary"
                                style={styles.sectionTitle}>
                                Active Tasks
                            </ThemedText>
                            {activeTodos.map((todo) => (
                                <TodoRow
                                    key={todo.id}
                                    todo={todo}
                                    theme={theme}
                                    onToggle={() => toggleTodo(todo.id)}
                                    onEdit={() => openEditModal(todo)}
                                    onDelete={() => deleteTodo(todo.id)}
                                />
                            ))}
                        </>
                    )}

                    {/* Completed Section */}
                    {completedTodos.length > 0 && (
                        <>
                            <ThemedText
                                themeColor="textSecondary"
                                style={styles.sectionTitle}>
                                Completed Tasks
                            </ThemedText>
                            {completedTodos.map((todo) => (
                                <TodoRow
                                    key={todo.id}
                                    todo={todo}
                                    theme={theme}
                                    onToggle={() => toggleTodo(todo.id)}
                                    onEdit={() => openEditModal(todo)}
                                    onDelete={() => deleteTodo(todo.id)}
                                />
                            ))}
                        </>
                    )}

                    {/* Empty State */}
                    {!hasTodos && (
                        <View
                            style={[
                                styles.emptyState,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                            ]}>
                            <ThemedText
                                themeColor="textSecondary"
                                style={styles.emptyText}>
                                No tasks in your list yet.{'\n'}Tap the button
                                below to add one.
                            </ThemedText>
                        </View>
                    )}
                </ScrollView>

                {/* Add todo button */}
                <View style={styles.addButtonContainer}>
                    <Pressable
                        onPress={openAddModal}
                        accessibilityLabel="Add a task"
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

            {/* Add / Edit todo modal */}
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
                            {/* Input description */}
                            <View style={styles.inputSection}>
                                <ThemedText
                                    type="default"
                                    style={styles.modalLabel}>
                                    Task description
                                </ThemedText>

                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[
                                            styles.todoInput,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                                color: theme.text,
                                            },
                                        ]}
                                        placeholder="Type task description here..."
                                        placeholderTextColor={
                                            theme.textSecondary
                                        }
                                        value={todoText}
                                        onChangeText={setTodoText}
                                        onSubmitEditing={handleSave}
                                        returnKeyType="done"
                                        autoFocus
                                        accessibilityLabel="Task description input"
                                    />
                                </View>
                            </View>

                            {/* Priority Selector */}
                            <View style={styles.inputSection}>
                                <ThemedText
                                    type="default"
                                    style={styles.modalLabel}>
                                    Task priority
                                </ThemedText>

                                <View style={styles.prioritySelectorRow}>
                                    {PRIORITIES.map((priority) => {
                                        const isSelected =
                                            todoPriority === priority;
                                        const color =
                                            priorityConfig[priority].color;
                                        return (
                                            <Pressable
                                                key={priority}
                                                onPress={() =>
                                                    setTodoPriority(priority)
                                                }
                                                accessibilityLabel={`Select priority ${priority}`}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    selected: isSelected,
                                                }}
                                                style={[
                                                    styles.prioritySelectorButton,
                                                    {
                                                        backgroundColor:
                                                            isSelected
                                                                ? color
                                                                : theme.backgroundElement,
                                                        borderColor: isSelected
                                                            ? color
                                                            : 'transparent',
                                                        borderWidth: 2,
                                                    },
                                                ]}>
                                                <ThemedText
                                                    style={[
                                                        styles.prioritySelectorText,
                                                        {
                                                            color: isSelected
                                                                ? '#FFFFFF'
                                                                : theme.text,
                                                        },
                                                    ]}>
                                                    {
                                                        priorityConfig[priority]
                                                            .label
                                                    }
                                                </ThemedText>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Assignee Selector */}
                            <View style={styles.inputSection}>
                                <ThemedText
                                    type="default"
                                    style={styles.modalLabel}>
                                    Assign to family member
                                </ThemedText>

                                <View style={styles.assigneeSelectorList}>
                                    {MOCK_USERS.map((user) => {
                                        const isSelected =
                                            todoAssigneeId === user.id;
                                        return (
                                            <Pressable
                                                key={user.id}
                                                onPress={() =>
                                                    setTodoAssigneeId(user.id)
                                                }
                                                accessibilityLabel={`Assign to ${user.name}`}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    selected: isSelected,
                                                }}
                                                style={[
                                                    styles.assigneeListRow,
                                                    {
                                                        backgroundColor:
                                                            isSelected
                                                                ? theme.backgroundSelected
                                                                : 'transparent',
                                                    },
                                                ]}>
                                                <View
                                                    style={[
                                                        styles.assigneeSelectButton,
                                                        {
                                                            backgroundColor:
                                                                user.color,
                                                        },
                                                    ]}>
                                                    <ThemedText
                                                        style={
                                                            styles.assigneeAvatarInitials
                                                        }>
                                                        {user.initials}
                                                    </ThemedText>
                                                </View>
                                                <ThemedText
                                                    style={
                                                        styles.assigneeRowName
                                                    }>
                                                    {user.name}
                                                </ThemedText>
                                                {isSelected && (
                                                    <SymbolView
                                                        name={{
                                                            ios: 'checkmark',
                                                            web: 'check',
                                                        }}
                                                        tintColor={theme.text}
                                                        size={16}
                                                    />
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                    <Pressable
                                        onPress={() =>
                                            setTodoAssigneeId(undefined)
                                        }
                                        accessibilityLabel="Unassign task"
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            selected:
                                                todoAssigneeId === undefined,
                                        }}
                                        style={[
                                            styles.assigneeListRow,
                                            {
                                                backgroundColor:
                                                    todoAssigneeId === undefined
                                                        ? theme.backgroundSelected
                                                        : 'transparent',
                                            },
                                        ]}>
                                        <View
                                            style={[
                                                styles.assigneeSelectButton,
                                                {
                                                    backgroundColor:
                                                        theme.backgroundElement,
                                                },
                                            ]}>
                                            <SymbolView
                                                name={{
                                                    ios: 'person.crop.circle',
                                                    web: 'person_outline',
                                                }}
                                                tintColor={theme.textSecondary}
                                                size={20}
                                            />
                                        </View>
                                        <ThemedText
                                            themeColor="textSecondary"
                                            style={styles.assigneeRowName}>
                                            None (Unassigned)
                                        </ThemedText>
                                        {todoAssigneeId === undefined && (
                                            <SymbolView
                                                name={{
                                                    ios: 'checkmark',
                                                    web: 'check',
                                                }}
                                                tintColor={theme.text}
                                                size={16}
                                            />
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal footer */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={handleSave}
                                disabled={!todoText.trim()}
                                accessibilityLabel="Save task"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.doneButton,
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
                                        styles.doneButtonText,
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
        gap: Spacing.two,
    },
    header: {
        paddingTop: Spacing.two,
        gap: Spacing.one,
        marginBottom: Spacing.two,
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
        marginTop: Spacing.two,
        marginBottom: Spacing.one,
    },
    swipeableContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    todoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
    },
    todoContent: {
        flex: 1,
    },
    todoLabel: {
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

    // Assignee styling
    assigneeAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeInitials: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        borderRadius: 14,
        padding: Spacing.five,
        gap: Spacing.three,
        marginTop: Spacing.two,
    },
    emptyText: {
        textAlign: 'center',
        lineHeight: 22,
    },

    // Swipe actions
    rightActionsContainer: {
        flexDirection: 'row',
        width: 160,
    },
    actionButton: {
        flex: 1,
        height: '100%',
    },
    actionPressable: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.one,
        paddingHorizontal: Spacing.one,
    },
    editButton: {
        backgroundColor: '#0A7EA4',
    },
    deleteButton: {
        backgroundColor: '#E5484D',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
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
        gap: Spacing.four,
        paddingBottom: Spacing.four,
    },
    modalLabel: {
        fontWeight: '600',
        marginBottom: Spacing.two,
    },
    inputSection: {
        gap: Spacing.one,
    },
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        alignItems: 'center',
    },
    todoInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
    },
    prioritySelectorRow: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    prioritySelectorButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.two,
        borderRadius: 10,
    },
    prioritySelectorText: {
        fontWeight: '600',
    },
    modalFooter: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
    },
    doneButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        padding: Spacing.three,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Assignee selectors
    assigneeSelectorList: {
        gap: Spacing.one,
        marginTop: Spacing.one,
    },
    assigneeListRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.two,
        borderRadius: 12,
    },
    assigneeSelectButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeAvatarInitials: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    assigneeRowName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
});
