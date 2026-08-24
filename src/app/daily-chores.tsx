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
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    type ChoreItem,
    MOCK_USERS,
    getDateRange,
    formatLocalDateString,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { PRESET_CHORES, useChores } from '@/hooks/use-chores';
import { useTheme } from '@/hooks/use-theme';

interface ChoreRowProps {
    chore: ChoreItem;
    onToggle: () => void;
    onDelete: () => void;
    onAssign: () => void;
    theme: any;
}

const ChoreRow = React.memo(
    ({ chore, onToggle, onDelete, onAssign, theme }: ChoreRowProps) => {
        const swipeableRef = useRef<Swipeable>(null);

        const renderRightActions = (
            progress: Animated.AnimatedInterpolation<number>,
            dragX: Animated.AnimatedInterpolation<number>
        ) => {
            const trans = dragX.interpolate({
                inputRange: [-80, 0],
                outputRange: [0, 80],
                extrapolate: 'clamp',
            });
            return (
                <View style={styles.rightActionsContainer}>
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

        const assignee = MOCK_USERS.find((u) => u.id === chore.assigneeId);

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
                        styles.choreRow,
                        {
                            backgroundColor: theme.backgroundElement,
                        },
                        pressed && {
                            backgroundColor: theme.backgroundSelected,
                        },
                    ]}>
                    <SymbolView
                        name={{
                            ios: chore.done
                                ? 'checkmark.circle.fill'
                                : 'circle',
                            web: chore.done
                                ? 'check_circle'
                                : 'radio_button_unchecked',
                        }}
                        tintColor={
                            chore.done ? theme.textSecondary : theme.text
                        }
                        size={22}
                    />
                    <ThemedText
                        type="default"
                        themeColor={chore.done ? 'textSecondary' : 'text'}
                        style={[
                            styles.choreLabel,
                            chore.done && styles.strikethrough,
                        ]}>
                        {chore.label}
                    </ThemedText>

                    {/* Assignee button */}
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onAssign();
                        }}
                        style={styles.assigneeBadgeContainer}>
                        {assignee ? (
                            <View
                                style={[
                                    styles.assigneeAvatar,
                                    { backgroundColor: theme[assignee.color] },
                                ]}>
                                <ThemedText
                                    themeColor="background"
                                    style={styles.assigneeInitials}>
                                    {assignee.initials}
                                </ThemedText>
                            </View>
                        ) : (
                            <View
                                style={[
                                    styles.assigneeAvatar,
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
                                    size={14}
                                />
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Swipeable>
        );
    }
);

ChoreRow.displayName = 'ChoreRow';

export default function DailyChoresScreen() {
    const theme = useTheme();
    const {
        chores,
        loading,
        toggleChore,
        deleteChore,
        toggleChoreActive,
        assignChore,
    } = useChores();
    const [modalVisible, setModalVisible] = useState(false);
    const [assigningChoreId, setAssigningChoreId] = useState<string | null>(
        null
    );
    const [isDayPreselected, setIsDayPreselected] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const todayYOffsetRef = useRef<number | null>(null);
    const todayStr = getRelativeDateString(0);
    const [selectedDay, setSelectedDay] = useState<string>(todayStr);

    const dates = getDateRange();
    const doneCount = chores.filter((c) => c.done).length;
    const hasChores = chores.length > 0;

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

    const isChoreActive = (label: string) =>
        chores.some((c) => c.label === label && c.day === selectedDay);

    const openAddModal = () => {
        setSelectedDay(todayStr);
        setIsDayPreselected(false);
        setModalVisible(true);
    };

    const openAddModalForDay = (day: string) => {
        setSelectedDay(day);
        setIsDayPreselected(true);
        setModalVisible(true);
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
                        Chores Plan
                    </ThemedText>
                    <ThemedText
                        themeColor="textSecondary"
                        style={styles.subtitle}>
                        {loading
                            ? ''
                            : hasChores
                              ? `${doneCount} of ${chores.length} completed in total`
                              : 'No chores planned'}
                    </ThemedText>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Weekly Chores List grouped by day */}
                    {dates.map((day) => {
                        const dayChores = chores.filter((c) => c.day === day);
                        const dayDoneCount = dayChores.filter(
                            (c) => c.done
                        ).length;
                        const dayProgress =
                            dayChores.length > 0
                                ? Math.round(
                                      (dayDoneCount / dayChores.length) * 100
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
                                        {dayChores.length > 0 && (
                                            <ThemedText
                                                themeColor="textSecondary"
                                                type="small"
                                                style={styles.dayProgressText}>
                                                • {dayDoneCount}/
                                                {dayChores.length} done
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
                                        accessibilityLabel={`Add chores for ${formatLocalDateString(day)}`}
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
                                {dayChores.length > 0 && (
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

                                {/* Day Chores List */}
                                {dayChores.length === 0 ? (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small"
                                        style={styles.noChoresText}>
                                        {loading
                                            ? ''
                                            : 'No chores active for this day.'}
                                    </ThemedText>
                                ) : (
                                    <View style={styles.dayChoresList}>
                                        {dayChores.map((chore) => (
                                            <ChoreRow
                                                key={chore.id}
                                                chore={chore}
                                                theme={theme}
                                                onToggle={() =>
                                                    toggleChore(chore.id)
                                                }
                                                onDelete={() =>
                                                    deleteChore(chore.id)
                                                }
                                                onAssign={() =>
                                                    setAssigningChoreId(
                                                        chore.id
                                                    )
                                                }
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Add chores button */}
                <View style={styles.addButtonContainer}>
                    <Pressable
                        onPress={openAddModal}
                        accessibilityLabel="Add chores"
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
                            Add Chores
                        </ThemedText>
                    </Pressable>
                </View>
            </SafeAreaView>

            {/* Manage chores modal */}
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
                            <ThemedText type="subtitle">Add Chores</ThemedText>
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
                                            const isSelected =
                                                selectedDay === day;
                                            return (
                                                <Pressable
                                                    key={day}
                                                    onPress={() =>
                                                        setSelectedDay(day)
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

                            <View style={styles.inputSection}>
                                <ThemedText
                                    themeColor="textSecondary"
                                    type="small"
                                    style={styles.modalInstructionText}>
                                    Select which chores are active for{' '}
                                    {formatLocalDateString(selectedDay)}:
                                </ThemedText>

                                <View style={styles.pillsGrid}>
                                    {PRESET_CHORES.map((preset) => {
                                        const active = isChoreActive(preset);
                                        return (
                                            <Pressable
                                                key={preset}
                                                onPress={() =>
                                                    toggleChoreActive(
                                                        preset,
                                                        selectedDay
                                                    )
                                                }
                                                accessibilityLabel={`Toggle ${preset}`}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    selected: active,
                                                }}
                                                style={[
                                                    styles.presetChorePill,
                                                    {
                                                        backgroundColor: active
                                                            ? theme.text
                                                            : theme.backgroundElement,
                                                        borderColor: active
                                                            ? theme.text
                                                            : 'transparent',
                                                        borderWidth: 2,
                                                    },
                                                ]}>
                                                <ThemedText
                                                    style={[
                                                        styles.presetChoreText,
                                                        {
                                                            color: active
                                                                ? theme.background
                                                                : theme.text,
                                                        },
                                                    ]}>
                                                    {preset}
                                                </ThemedText>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal footer */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={closeModal}
                                accessibilityLabel="Done"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.doneButton,
                                    {
                                        backgroundColor: theme.text,
                                    },
                                    pressed && {
                                        opacity: 0.8,
                                    },
                                ]}>
                                <ThemedText
                                    style={[
                                        styles.doneButtonText,
                                        {
                                            color: theme.background,
                                        },
                                    ]}>
                                    Done
                                </ThemedText>
                            </Pressable>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Assignee Selection Modal */}
            <Modal
                visible={assigningChoreId !== null}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setAssigningChoreId(null)}>
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setAssigningChoreId(null)}>
                    <View
                        style={[
                            styles.assigneeModalContent,
                            { backgroundColor: theme.background },
                        ]}>
                        <ThemedText
                            type="subtitle"
                            style={styles.assigneeModalTitle}>
                            Assign Chore
                        </ThemedText>

                        <ScrollView
                            style={styles.assigneeList}
                            showsVerticalScrollIndicator={false}>
                            {MOCK_USERS.map((user) => (
                                <Pressable
                                    key={user.id}
                                    onPress={() => {
                                        if (assigningChoreId) {
                                            assignChore(
                                                assigningChoreId,
                                                user.id
                                            );
                                        }
                                        setAssigningChoreId(null);
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
                                                    theme[user.color],
                                            },
                                        ]}>
                                        <ThemedText
                                            themeColor="background"
                                            style={
                                                styles.assigneeInitialsLarge
                                            }>
                                            {user.initials}
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={styles.assigneeName}>
                                        {user.name}
                                    </ThemedText>
                                </Pressable>
                            ))}

                            <Pressable
                                onPress={() => {
                                    if (assigningChoreId) {
                                        assignChore(
                                            assigningChoreId,
                                            undefined
                                        );
                                    }
                                    setAssigningChoreId(null);
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
                            onPress={() => setAssigningChoreId(null)}
                            style={[
                                styles.assigneeCloseButton,
                                { backgroundColor: theme.backgroundElement },
                            ]}>
                            <ThemedText style={{ fontWeight: '600' }}>
                                Cancel
                            </ThemedText>
                        </Pressable>
                    </View>
                </Pressable>
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
    noChoresText: {
        fontStyle: 'italic',
        paddingVertical: Spacing.half,
    },
    dayChoresList: {
        gap: Spacing.two,
    },

    swipeableContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    choreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
    },
    choreLabel: {
        flex: 1,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },

    // Assignee styling
    assigneeBadgeContainer: {
        padding: Spacing.one,
    },
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
    modalInstructionText: {
        marginBottom: Spacing.two,
    },
    inputSection: {
        marginTop: Spacing.one,
    },
    pillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    presetChorePill: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 20,
    },
    presetChoreText: {
        fontSize: 14,
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

    // Modal footer
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

    // Swipeable Actions
    rightActionsContainer: {
        width: 80,
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
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },

    // Assignee Selection Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
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
    assigneeList: {
        maxHeight: 300,
    },
    assigneeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.two,
        borderRadius: 14,
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
    assigneeCloseButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.three,
        borderRadius: 14,
        marginTop: Spacing.one,
    },
});
