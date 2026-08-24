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
    getDateRange,
    formatLocalDateString,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMembers } from '@/hooks/use-members';
import { useTodos } from '@/hooks/use-todos';

interface TodoRowProps {
    todo: TodoItem;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAssign: () => void;
    theme: any;
}

const TodoRow = React.memo(
    ({ todo, onToggle, onEdit, onDelete, onAssign, theme }: TodoRowProps) => {
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

        const assignee = members.find((u) => u.id === todo.assigneeId);
        const priorityColors = {
            low: 'priorityLow',
            medium: 'priorityMedium',
            high: 'priorityHigh',
        } as const;

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={renderRightActions}
                containerStyle={styles.swipeableContainer}>
                <View
                    style={[
                        styles.todoRow,
                        {
                            backgroundColor: theme.backgroundElement,
                        },
                    ]}>
                    <Pressable
                        onPress={onToggle}
                        style={({ pressed }) => [
                            styles.todoMain,
                            pressed && { opacity: 0.6 },
                        ]}>
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
                                todo.done ? theme.textSecondary : theme.text
                            }
                            size={22}
                        />
                        <View
                            style={[
                                styles.priorityDot,
                                {
                                    backgroundColor:
                                        theme[priorityColors[todo.priority]],
                                },
                            ]}
                        />
                        <ThemedText
                            type="default"
                            themeColor={todo.done ? 'textSecondary' : 'text'}
                            style={[
                                styles.todoLabel,
                                todo.done && styles.strikethrough,
                            ]}>
                            {todo.label}
                        </ThemedText>
                    </Pressable>

                    <Pressable
                        onPress={onAssign}
                        accessibilityLabel={
                            assignee
                                ? `Assigned to ${assignee.name}. Change assignee`
                                : 'Assign task'
                        }
                        accessibilityRole="button"
                        style={styles.assigneeBadgeContainer}>
                        <View
                            style={[
                                styles.assigneeAvatar,
                                {
                                    backgroundColor: assignee
                                        ? theme[assignee.color]
                                        : theme.backgroundSelected,
                                },
                            ]}>
                            {assignee ? (
                                <ThemedText
                                    themeColor="background"
                                    style={styles.assigneeInitials}>
                                    {assignee.initials}
                                </ThemedText>
                            ) : (
                                <SymbolView
                                    name={{
                                        ios: 'person.crop.circle',
                                        web: 'person_outline',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={14}
                                />
                            )}
                        </View>
                    </Pressable>
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
        addTodo,
        toggleTodo,
        editTodo,
        deleteTodo,
        assignTodo,
    } = useTodos();
    const { members } = useMembers();
    const [modalVisible, setModalVisible] = useState(false);
    const [assigningTodoId, setAssigningTodoId] = useState<string | null>(null);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    const [todoText, setTodoText] = useState('');
    const [todoPriority, setTodoPriority] =
        useState<TodoItem['priority']>('medium');
    const [todoAssigneeId, setTodoAssigneeId] = useState<string | undefined>(
        undefined
    );
    const [isDayPreselected, setIsDayPreselected] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const todayYOffsetRef = useRef<number | null>(null);
    const todayStr = getRelativeDateString(0);
    const [todoDay, setTodoDay] = useState<string>(todayStr);

    const dates = getDateRange();
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
        setIsDayPreselected(false);
        setModalVisible(true);
    };

    const openAddModalForDay = (day: string) => {
        setEditingTodo(null);
        setTodoText('');
        setTodoPriority('medium');
        setTodoDay(day);
        setTodoAssigneeId(undefined);
        setIsDayPreselected(true);
        setModalVisible(true);
    };

    const openEditModal = (todo: TodoItem) => {
        setEditingTodo(todo);
        setTodoText(todo.label);
        setTodoPriority(todo.priority);
        setTodoDay(todo.day);
        setTodoAssigneeId(todo.assigneeId);
        setIsDayPreselected(true);
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
                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.pageTitle}>
                        To-Do List
                    </ThemedText>
                    <ThemedText
                        themeColor="textSecondary"
                        style={styles.subtitle}>
                        {completedTodos.length} of {todos.length} completed in
                        total
                    </ThemedText>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Todos grouped by day */}
                    {dates.map((day) => {
                        const dayTodos = todos.filter((t) => t.day === day);
                        const dayDoneCount = dayTodos.filter(
                            (t) => t.done
                        ).length;
                        const dayProgress =
                            dayTodos.length > 0
                                ? Math.round(
                                      (dayDoneCount / dayTodos.length) * 100
                                  )
                                : 0;
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
                                        {dayTodos.length > 0 && (
                                            <ThemedText
                                                themeColor="textSecondary"
                                                type="small"
                                                style={styles.dayProgressText}>
                                                • {dayDoneCount}/
                                                {dayTodos.length} done
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

                                {/* Day Progress Bar */}
                                {dayTodos.length > 0 && (
                                    <View
                                        style={[
                                            styles.dayProgressTrack,
                                            {
                                                backgroundColor:
                                                    theme.backgroundSelected,
                                            },
                                        ]}>
                                        <View
                                            style={[
                                                styles.dayProgressFill,
                                                {
                                                    width: `${dayProgress}%`,
                                                    backgroundColor: theme.text,
                                                },
                                            ]}
                                        />
                                    </View>
                                )}

                                {/* Day Todo List */}
                                {dayTodos.length === 0 ? (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small"
                                        style={styles.noTodosText}>
                                        {loading
                                            ? ''
                                            : 'No tasks planned for this day.'}
                                    </ThemedText>
                                ) : (
                                    <View style={styles.dayTodosList}>
                                        {dayTodos.map((todo) => (
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
                                                onAssign={() =>
                                                    setAssigningTodoId(todo.id)
                                                }
                                            />
                                        ))}
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
                            {!isDayPreselected && (
                                <>
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
                                                    onPress={() =>
                                                        setTodoDay(day)
                                                    }
                                                    style={[
                                                        styles.dayPill,
                                                        {
                                                            backgroundColor:
                                                                isSelected
                                                                    ? theme.text
                                                                    : theme.backgroundElement,
                                                            borderColor:
                                                                isSelected
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
                                                        {formatShortDateString(
                                                            day
                                                        )}
                                                    </ThemedText>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                </>
                            )}

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
                                            <View
                                                style={[
                                                    styles.editAssigneeAvatar,
                                                    {
                                                        backgroundColor:
                                                            theme[user.color],
                                                    },
                                                ]}>
                                                <ThemedText
                                                    themeColor="background"
                                                    style={
                                                        styles.editAssigneeInitials
                                                    }>
                                                    {user.initials}
                                                </ThemedText>
                                            </View>
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

            {/* Assignee Selection Modal */}
            <Modal
                visible={assigningTodoId !== null}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setAssigningTodoId(null)}>
                <View style={styles.modalOverlay}>
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
                                    <View
                                        style={[
                                            styles.assigneeAvatarLarge,
                                            {
                                                backgroundColor:
                                                    theme[member.color],
                                            },
                                        ]}>
                                        <ThemedText
                                            themeColor="background"
                                            style={
                                                styles.assigneeInitialsLarge
                                            }>
                                            {member.initials}
                                        </ThemedText>
                                    </View>
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
                                <View
                                    style={[
                                        styles.assigneeAvatarLarge,
                                        {
                                            backgroundColor:
                                                theme.backgroundSelected,
                                        },
                                    ]}>
                                    <SymbolView
                                        name={{
                                            ios: 'person.crop.circle',
                                            web: 'person_outline',
                                        }}
                                        tintColor={theme.textSecondary}
                                        size={22}
                                    />
                                </View>
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
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
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
        gap: Spacing.two,
    },
    dayCardTitleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
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

    swipeableContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    todoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    todoMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
    },
    assigneeBadgeContainer: {
        paddingVertical: Spacing.three,
        paddingLeft: Spacing.one,
        paddingRight: Spacing.three,
    },
    dayProgressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginVertical: Spacing.half,
    },
    dayProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    dayTodosList: {
        gap: Spacing.two,
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
    },
    todoLabel: {
        flex: 1,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },

    // Priority Dot
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
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
        fontSize: 12,
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
    editAssigneeAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editAssigneeInitials: {
        fontSize: 14,
        fontWeight: '700',
    },
    editAssigneeName: {
        fontSize: 16,
        fontWeight: '500',
    },
    assigneeAvatarLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeInitialsLarge: {
        fontSize: 16,
        fontWeight: '700',
    },
    assigneeName: {
        fontSize: 16,
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
