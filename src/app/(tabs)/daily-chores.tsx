import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
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

import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { MemberAvatar } from '@/components/member-avatar';
import { ThemedView } from '@/components/themed-view';
import {
    getDateRange,
    formatLocalDateString,
    formatShortDateString,
    getRelativeDateString,
    todayLabel,
} from '@/constants/dates';
import { type ChoreDefinition, type ChoreItem } from '@/constants/types';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChoreDefinitions } from '@/hooks/use-chore-definitions';
import { useChores } from '@/hooks/use-chores';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

interface ChoreRowProps {
    chore: ChoreItem;
    name: string;
    canManage: boolean;
    canToggle: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onAssign: () => void;
    theme: any;
}

const ChoreRow = React.memo(
    ({
        chore,
        name,
        canManage,
        canToggle,
        onToggle,
        onDelete,
        onAssign,
        theme,
    }: ChoreRowProps) => {
        const { members } = useMembers();
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

        const assignee = members.find((u) => u.id === chore.assigneeId);

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={canManage ? renderRightActions : undefined}
                containerStyle={styles.swipeableContainer}>
                <View
                    style={[
                        styles.choreRow,
                        {
                            backgroundColor: theme.backgroundElement,
                        },
                    ]}>
                    <Pressable
                        onPress={onToggle}
                        disabled={!canToggle}
                        style={({ pressed }) => [
                            styles.choreMain,
                            pressed && { opacity: 0.6 },
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
                                chore.done || !canToggle
                                    ? theme.textSecondary
                                    : theme.text
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
                            {name}
                        </ThemedText>
                    </Pressable>

                    {/* Assignee button */}
                    {(canManage || assignee) && (
                        <Pressable
                            onPress={onAssign}
                            disabled={!canManage}
                            style={styles.assigneeBadgeContainer}>
                            <MemberAvatar member={assignee ?? null} size={28} />
                        </Pressable>
                    )}
                </View>
            </Swipeable>
        );
    }
);

ChoreRow.displayName = 'ChoreRow';

export default function DailyChoresScreen() {
    const theme = useTheme();
    const scheme = useColorScheme();
    const {
        chores,
        loading,
        error: choresError,
        clearError: clearChoresError,
        toggleChore,
        deleteChore,
        toggleChoreActive,
        assignChore,
    } = useChores();
    const {
        definitions,
        loading: definitionsLoading,
        error: definitionsError,
        clearError: clearDefinitionsError,
        addDefinition,
        renameDefinition,
        deleteDefinition,
    } = useChoreDefinitions();
    const { members } = useMembers();
    const { canManageChore, canManageContent, canToggle } = usePermissions();
    const [modalVisible, setModalVisible] = useState(false);
    const [assigningChoreId, setAssigningChoreId] = useState<string | null>(
        null
    );
    const [isDayPreselected, setIsDayPreselected] = useState(false);
    const [newChoreName, setNewChoreName] = useState('');
    const [editing, setEditing] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameText, setRenameText] = useState('');
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    /** Two collections, one message: a screen never has two places to look. */
    const error = choresError ?? definitionsError;

    const clearError = () => {
        clearChoresError();
        clearDefinitionsError();
    };

    const scrollViewRef = useRef<ScrollView>(null);
    const todayYOffsetRef = useRef<number | null>(null);
    const todayStr = getRelativeDateString(0);
    const [selectedDay, setSelectedDay] = useState<string>(todayStr);

    const dates = getDateRange();

    /**
     * An inactive chore is one that is not planned for its day. It is still a
     * row - that is the point of the flag - so every count and every list on
     * this screen works from the planned ones.
     */
    const activeChores = chores.filter((chore) => chore.active);
    const doneCount = activeChores.filter((c) => c.done).length;
    const hasChores = activeChores.length > 0;

    /**
     * A day entry is called whatever the chore it was planned from is called,
     * so a rename reaches every day at once - and an entry has nothing of its
     * own to show until that chore has been read from the device.
     */
    const choreNames = new Map(definitions.map((one) => [one.id, one.name]));
    const nameOf = (chore: ChoreItem) =>
        choreNames.get(chore.definitionId) ?? '';

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

    const isPlanned = (definitionId: string) =>
        activeChores.some(
            (c) => c.definitionId === definitionId && c.day === selectedDay
        );

    /**
     * Naming a chore adds it to the family and plans it for the day being
     * looked at, which is the whole of what the field is for. A name the
     * family already has is that chore rather than a second one like it.
     */
    const addNewChore = async () => {
        const name = newChoreName.trim();
        if (!name) return;

        const existing = definitions.find(
            (one) => one.name.toLowerCase() === name.toLowerCase()
        );
        const definition = existing ?? (await addDefinition(name));
        if (!definition) return;

        setNewChoreName('');
        if (!isPlanned(definition.id)) {
            await toggleChoreActive(definition.id, selectedDay);
        }
    };

    const startRenaming = (definition: ChoreDefinition) => {
        setConfirmingId(null);
        setRenamingId(definition.id);
        setRenameText(definition.name);
    };

    const saveRename = async () => {
        const name = renameText.trim();
        if (!renamingId || !name) return;
        if (await renameDefinition(renamingId, name)) setRenamingId(null);
    };

    const confirmDelete = async () => {
        if (!confirmingId) return;
        if (await deleteDefinition(confirmingId)) setConfirmingId(null);
    };

    const toggleEditing = () => {
        setEditing(!editing);
        setRenamingId(null);
        setConfirmingId(null);
    };

    const openAddModal = () => {
        setSelectedDay(todayStr);
        setIsDayPreselected(false);
        clearError();
        setModalVisible(true);
    };

    const openAddModalForDay = (day: string) => {
        setSelectedDay(day);
        setIsDayPreselected(true);
        clearError();
        setModalVisible(true);
    };

    const closeModal = () => {
        clearError();
        setNewChoreName('');
        setEditing(false);
        setRenamingId(null);
        setConfirmingId(null);
        setModalVisible(false);
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

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
                              ? `${doneCount} of ${activeChores.length} completed in total`
                              : 'No chores planned'}
                    </ThemedText>
                    {error && (
                        <ThemedText
                            type="small"
                            style={{ color: theme.destructive }}>
                            {error}
                        </ThemedText>
                    )}
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Weekly Chores List grouped by day */}
                    {dates.map((day) => {
                        const dayChores = activeChores.filter(
                            (c) => c.day === day
                        );
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
                                                    {todayLabel}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    {canManageContent && (
                                        <Pressable
                                            onPress={() =>
                                                openAddModalForDay(day)
                                            }
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
                                    )}
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
                                                name={nameOf(chore)}
                                                theme={theme}
                                                canManage={canManageContent}
                                                canToggle={canToggle(
                                                    chore.assigneeId
                                                )}
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
                {canManageContent && (
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
                )}
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
                            <View style={styles.modalHeaderActions}>
                                {definitions.length > 0 && (
                                    <Pressable
                                        onPress={toggleEditing}
                                        hitSlop={8}
                                        accessibilityLabel={
                                            editing
                                                ? 'Stop editing chores'
                                                : 'Edit chores'
                                        }
                                        accessibilityRole="button">
                                        <ThemedText themeColor="link">
                                            {editing ? 'Done' : 'Edit'}
                                        </ThemedText>
                                    </Pressable>
                                )}
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
                                    type="default"
                                    style={styles.modalLabel}>
                                    New chore
                                </ThemedText>
                                <View style={styles.newChoreRow}>
                                    <TextInput
                                        style={[
                                            styles.textInput,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                                color: theme.text,
                                            },
                                        ]}
                                        placeholder="Name a chore..."
                                        placeholderTextColor={
                                            theme.textSecondary
                                        }
                                        value={newChoreName}
                                        onChangeText={setNewChoreName}
                                        onSubmitEditing={addNewChore}
                                        returnKeyType="done"
                                        accessibilityLabel="New chore"
                                    />
                                    <Pressable
                                        onPress={addNewChore}
                                        disabled={!newChoreName.trim()}
                                        accessibilityLabel="Add this chore"
                                        accessibilityRole="button"
                                        style={({ pressed }) => [
                                            styles.newChoreButton,
                                            { backgroundColor: theme.text },
                                            (pressed ||
                                                !newChoreName.trim()) && {
                                                opacity: 0.5,
                                            },
                                        ]}>
                                        <ThemedText
                                            style={[
                                                styles.newChoreButtonText,
                                                { color: theme.background },
                                            ]}>
                                            Add
                                        </ThemedText>
                                    </Pressable>
                                </View>

                                <ThemedText
                                    themeColor="textSecondary"
                                    type="small"
                                    style={styles.modalInstructionText}>
                                    {editing
                                        ? 'Rename or delete the chores you added:'
                                        : `Select which chores are active for ${formatLocalDateString(selectedDay)}:`}
                                </ThemedText>

                                {definitions.length === 0 ? (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small"
                                        style={styles.noChoresText}>
                                        {definitionsLoading
                                            ? ''
                                            : 'No chores yet. Add the first one above.'}
                                    </ThemedText>
                                ) : editing ? (
                                    <View style={styles.definitionList}>
                                        {definitions.map((definition) => {
                                            const manageable = canManageChore(
                                                definition.createdBy
                                            );
                                            const renaming =
                                                renamingId === definition.id;

                                            if (
                                                confirmingId === definition.id
                                            ) {
                                                return (
                                                    <View
                                                        key={definition.id}
                                                        style={[
                                                            styles.definitionRow,
                                                            styles.definitionConfirm,
                                                            {
                                                                backgroundColor:
                                                                    theme.backgroundElement,
                                                            },
                                                        ]}>
                                                        <ThemedText type="small">
                                                            Delete{' '}
                                                            {definition.name}?
                                                            It goes from every
                                                            day it is planned
                                                            on.
                                                        </ThemedText>
                                                        <View
                                                            style={
                                                                styles.definitionConfirmActions
                                                            }>
                                                            <Pressable
                                                                onPress={() =>
                                                                    setConfirmingId(
                                                                        null
                                                                    )
                                                                }
                                                                accessibilityRole="button">
                                                                <ThemedText themeColor="textSecondary">
                                                                    Cancel
                                                                </ThemedText>
                                                            </Pressable>
                                                            <Pressable
                                                                onPress={
                                                                    confirmDelete
                                                                }
                                                                accessibilityRole="button">
                                                                <ThemedText
                                                                    style={{
                                                                        color: theme.destructive,
                                                                    }}>
                                                                    Delete
                                                                </ThemedText>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            }

                                            return (
                                                <View
                                                    key={definition.id}
                                                    style={[
                                                        styles.definitionRow,
                                                        {
                                                            backgroundColor:
                                                                theme.backgroundElement,
                                                        },
                                                    ]}>
                                                    {renaming ? (
                                                        <TextInput
                                                            style={[
                                                                styles.definitionInput,
                                                                {
                                                                    color: theme.text,
                                                                },
                                                            ]}
                                                            value={renameText}
                                                            onChangeText={
                                                                setRenameText
                                                            }
                                                            onSubmitEditing={
                                                                saveRename
                                                            }
                                                            returnKeyType="done"
                                                            autoFocus
                                                            accessibilityLabel={`Rename ${definition.name}`}
                                                        />
                                                    ) : (
                                                        <ThemedText
                                                            themeColor={
                                                                manageable
                                                                    ? 'text'
                                                                    : 'textSecondary'
                                                            }
                                                            style={
                                                                styles.definitionName
                                                            }>
                                                            {definition.name}
                                                        </ThemedText>
                                                    )}

                                                    {manageable && (
                                                        <View
                                                            style={
                                                                styles.definitionActions
                                                            }>
                                                            <Pressable
                                                                onPress={() =>
                                                                    renaming
                                                                        ? saveRename()
                                                                        : startRenaming(
                                                                              definition
                                                                          )
                                                                }
                                                                hitSlop={8}
                                                                accessibilityLabel={
                                                                    renaming
                                                                        ? `Save ${definition.name}`
                                                                        : `Rename ${definition.name}`
                                                                }
                                                                accessibilityRole="button">
                                                                <SymbolView
                                                                    name={{
                                                                        ios: renaming
                                                                            ? 'checkmark'
                                                                            : 'pencil',
                                                                        web: renaming
                                                                            ? 'check'
                                                                            : 'edit',
                                                                    }}
                                                                    tintColor={
                                                                        theme.text
                                                                    }
                                                                    size={20}
                                                                />
                                                            </Pressable>
                                                            <Pressable
                                                                onPress={() => {
                                                                    setRenamingId(
                                                                        null
                                                                    );
                                                                    setConfirmingId(
                                                                        definition.id
                                                                    );
                                                                }}
                                                                hitSlop={8}
                                                                accessibilityLabel={`Delete ${definition.name}`}
                                                                accessibilityRole="button">
                                                                <SymbolView
                                                                    name={{
                                                                        ios: 'trash',
                                                                        web: 'delete',
                                                                    }}
                                                                    tintColor={
                                                                        theme.destructive
                                                                    }
                                                                    size={20}
                                                                />
                                                            </Pressable>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <View style={styles.pillsGrid}>
                                        {definitions.map((definition) => {
                                            const planned = isPlanned(
                                                definition.id
                                            );
                                            return (
                                                <Pressable
                                                    key={definition.id}
                                                    onPress={() =>
                                                        toggleChoreActive(
                                                            definition.id,
                                                            selectedDay
                                                        )
                                                    }
                                                    accessibilityLabel={`Toggle ${definition.name}`}
                                                    accessibilityRole="button"
                                                    accessibilityState={{
                                                        selected: planned,
                                                    }}
                                                    style={[
                                                        styles.chorePill,
                                                        {
                                                            backgroundColor:
                                                                planned
                                                                    ? theme.text
                                                                    : theme.backgroundElement,
                                                            borderColor: planned
                                                                ? theme.text
                                                                : 'transparent',
                                                            borderWidth: 2,
                                                        },
                                                    ]}>
                                                    <ThemedText
                                                        style={[
                                                            styles.chorePillText,
                                                            {
                                                                color: planned
                                                                    ? theme.background
                                                                    : theme.text,
                                                            },
                                                        ]}>
                                                        {definition.name}
                                                    </ThemedText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Modal footer */}
                        <View style={styles.modalFooter}>
                            {error && (
                                <ThemedText
                                    type="small"
                                    style={{ color: theme.destructive }}>
                                    {error}
                                </ThemedText>
                            )}
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
                animationType="none"
                transparent={true}
                onRequestClose={() => setAssigningChoreId(null)}>
                <BlurView
                    intensity={40}
                    tint={scheme === 'dark' ? 'dark' : 'light'}
                    experimentalBlurMethod="dimezisBlurView"
                    style={styles.modalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setAssigningChoreId(null)}
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
                            Assign Chore
                        </ThemedText>

                        <ScrollView
                            style={styles.assigneeList}
                            showsVerticalScrollIndicator={false}>
                            {members.map((user) => (
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
                                    <MemberAvatar member={user} size={40} />
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
                                <MemberAvatar member={null} size={40} />
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
        gap: Spacing.one,
    },

    swipeableContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    choreRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    choreLabel: {
        flex: 1,
    },
    choreMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two + Spacing.one,
        paddingHorizontal: Spacing.three,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },

    // Assignee styling
    assigneeBadgeContainer: {
        paddingVertical: Spacing.two + Spacing.one,
        paddingLeft: Spacing.one,
        paddingRight: Spacing.three,
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        /** Outside the scroll view, so it clears the floating tab bar itself. */
        paddingBottom: BottomTabInset + Spacing.three,
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
    modalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
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
        marginTop: Spacing.three,
        marginBottom: Spacing.two,
    },
    inputSection: {
        marginTop: Spacing.one,
    },
    newChoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        marginTop: Spacing.two,
    },
    textInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
    },
    newChoreButton: {
        height: 48,
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
        borderRadius: 12,
    },
    newChoreButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    pillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    chorePill: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 20,
    },
    chorePillText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // The family's chores, as rows that can be renamed and deleted
    definitionList: {
        gap: Spacing.one,
    },
    definitionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        borderRadius: 14,
        paddingVertical: Spacing.two + Spacing.one,
        paddingHorizontal: Spacing.three,
    },
    definitionName: {
        flex: 1,
    },
    definitionInput: {
        flex: 1,
        fontSize: 16,
    },
    definitionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
    },
    definitionConfirm: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: Spacing.two,
    },
    definitionConfirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.four,
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
        gap: Spacing.two,
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
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
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
