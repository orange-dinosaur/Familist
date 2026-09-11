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

import { ChoiceCard } from '@/components/choice-card';
import { DatePickerModal } from '@/components/date-picker-modal';
import { MemberPicker } from '@/components/form-sheet';
import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { MemberAvatar } from '@/components/member-avatar';
import { ThemedView } from '@/components/themed-view';
import {
    getDateRange,
    formatLocalDateString,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/dates';
import { type ChoreDefinition, type ChoreItem } from '@/constants/types';
import {
    BottomTabInset,
    Colors,
    Fonts,
    MaxContentWidth,
    Spacing,
} from '@/constants/theme';
import { useChoreDefinitions } from '@/hooks/use-chore-definitions';
import { useChores } from '@/hooks/use-chores';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';

/** Seven of these fill a phone; the rest of the range scrolls. */
const DayColumnWidth = 48;

/** The day the screen is showing, written out: "Mon 8 September". */
function dayHeading(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
    });
}

/** The initial and the date the strip puts in each column. */
function dayColumn(dateStr: string): { initial: string; date: string } {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return {
        initial: d
            .toLocaleDateString(undefined, { weekday: 'narrow' })
            .toLocaleUpperCase(),
        date: `${d.getDate()}`,
    };
}

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
                                tintColor={Colors.light.background}
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
                        { borderBottomColor: `${theme.text}17` },
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
                            size={19}
                        />
                        <ThemedText
                            type="small"
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
                            <MemberAvatar member={assignee ?? null} size={24} />
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
    const { canManageChore, canManageContent, canToggle } = usePermissions();
    const [modalVisible, setModalVisible] = useState(false);
    const [assigningChoreId, setAssigningChoreId] = useState<string | null>(
        null
    );
    const assigningChore = chores.find((one) => one.id === assigningChoreId);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
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

    const stripRef = useRef<ScrollView>(null);
    const todayStr = getRelativeDateString(0);
    const [selectedDay, setSelectedDay] = useState<string>(todayStr);

    const dates = getDateRange();

    /**
     * An inactive chore is one that is not planned for its day. It is still a
     * row - that is the point of the flag - so every count and every list on
     * this screen works from the planned ones.
     */
    const activeChores = chores.filter((chore) => chore.active);
    const hasChores = activeChores.length > 0;
    const doneToday = activeChores.filter(
        (c) => c.day === todayStr && c.done
    ).length;

    const dayChores = activeChores.filter((c) => c.day === selectedDay);
    const dayDoneCount = dayChores.filter((c) => c.done).length;
    const dayProgress =
        dayChores.length > 0
            ? Math.round((dayDoneCount / dayChores.length) * 100)
            : 0;

    /**
     * A day entry is called whatever the chore it was planned from is called,
     * so a rename reaches every day at once - and an entry has nothing of its
     * own to show until that chore has been read from the device.
     */
    const choreNames = new Map(definitions.map((one) => [one.id, one.name]));
    const nameOf = (chore: ChoreItem) =>
        choreNames.get(chore.definitionId) ?? '';

    /** The strip opens on the selected day rather than at its left edge. */
    useFocusEffect(
        React.useCallback(() => {
            const index = dates.indexOf(selectedDay);
            if (index < 0) return;
            stripRef.current?.scrollTo({
                x: Math.max(0, (index - 3) * DayColumnWidth),
                animated: false,
            });
            // The strip only needs placing when the screen comes back.
            // eslint-disable-next-line react-hooks/exhaustive-deps
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
        clearError();
        setModalVisible(true);
    };

    const closeModal = () => {
        clearError();
        setDatePickerVisible(false);
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
                    <ThemedText type="title">Chores</ThemedText>
                    <ThemedText
                        themeColor="textSecondary"
                        style={styles.subtitle}>
                        {loading
                            ? ''
                            : hasChores
                              ? `${activeChores.length} planned this week · ${doneToday} done today`
                              : 'No chores planned'}
                    </ThemedText>
                </View>

                {error && (
                    <ThemedText
                        type="small"
                        style={[styles.error, { color: theme.destructive }]}>
                        {error}
                    </ThemedText>
                )}

                <View
                    style={[
                        styles.strip,
                        { borderBottomColor: `${theme.text}29` },
                    ]}>
                    <ScrollView
                        ref={stripRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.stripContent}>
                        {dates.map((day) => {
                            const { initial, date } = dayColumn(day);
                            const isSelected = day === selectedDay;
                            const isToday = day === todayStr;
                            const dayColor = isToday
                                ? 'link'
                                : isSelected
                                  ? 'text'
                                  : 'textMuted';
                            return (
                                <Pressable
                                    key={day}
                                    onPress={() => setSelectedDay(day)}
                                    accessibilityLabel={
                                        isToday
                                            ? `Today, ${dayHeading(day)}`
                                            : dayHeading(day)
                                    }
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        selected: isSelected,
                                    }}
                                    style={styles.dayColumn}>
                                    <ThemedText
                                        type="label"
                                        themeColor={dayColor}>
                                        {initial}
                                    </ThemedText>
                                    <ThemedText
                                        type="figureSmall"
                                        themeColor={dayColor}
                                        style={styles.dayDate}>
                                        {date}
                                    </ThemedText>
                                    <View
                                        style={[
                                            styles.dayMark,
                                            isSelected && {
                                                backgroundColor: theme.text,
                                            },
                                        ]}
                                    />
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.dayHeading}>
                        <ThemedText type="label">
                            {dayHeading(selectedDay)}
                        </ThemedText>
                        {dayChores.length > 0 && (
                            <ThemedText
                                themeColor="textSecondary"
                                style={styles.dayCount}>
                                {dayDoneCount} / {dayChores.length}
                            </ThemedText>
                        )}
                    </View>

                    <View
                        style={[
                            styles.progressTrack,
                            { backgroundColor: `${theme.text}24` },
                        ]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${dayProgress}%`,
                                    backgroundColor: theme.memberSage,
                                },
                            ]}
                        />
                    </View>

                    {dayChores.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            type="small"
                            style={styles.noChoresText}>
                            {loading ? '' : 'No chores planned for this day.'}
                        </ThemedText>
                    ) : (
                        dayChores.map((chore) => (
                            <ChoreRow
                                key={chore.id}
                                chore={chore}
                                name={nameOf(chore)}
                                theme={theme}
                                canManage={canManageContent}
                                canToggle={canToggle(chore.assigneeId)}
                                onToggle={() => toggleChore(chore.id)}
                                onDelete={() => deleteChore(chore.id)}
                                onAssign={() => setAssigningChoreId(chore.id)}
                            />
                        ))
                    )}
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
                                { borderColor: theme.text },
                                pressed && { opacity: 0.6 },
                            ]}>
                            <ThemedText style={styles.addButtonText}>
                                Add chores
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
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Choose day
                            </ThemedText>
                            <View style={styles.dayPillsContainer}>
                                <Pressable
                                    onPress={() => setDatePickerVisible(true)}
                                    accessibilityLabel="Pick a day"
                                    accessibilityRole="button"
                                    style={[
                                        styles.dayPill,
                                        { backgroundColor: theme.text },
                                    ]}>
                                    <SymbolView
                                        name={{
                                            ios: 'calendar',
                                            web: 'calendar_month',
                                        }}
                                        tintColor={theme.background}
                                        size={18}
                                    />
                                    <ThemedText
                                        style={[
                                            styles.dayPillText,
                                            { color: theme.background },
                                        ]}>
                                        {formatShortDateString(selectedDay)}
                                    </ThemedText>
                                </Pressable>
                            </View>

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

                        <DatePickerModal
                            visible={datePickerVisible}
                            value={selectedDay}
                            onSelect={(day) => {
                                setSelectedDay(day);
                                setDatePickerVisible(false);
                            }}
                            onClose={() => setDatePickerVisible(false)}
                        />
                    </SafeAreaView>
                </View>
            </Modal>

            <ChoiceCard
                visible={assigningChoreId !== null}
                title="Assign chore"
                onClose={() => setAssigningChoreId(null)}>
                <MemberPicker
                    chosenId={assigningChore?.assigneeId ?? undefined}
                    noneLabel="Unassigned"
                    onChoose={(memberId) => {
                        if (assigningChoreId) {
                            assignChore(assigningChoreId, memberId);
                        }
                        setAssigningChoreId(null);
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
    subtitle: {
        marginTop: Spacing.two,
        fontSize: 13,
        lineHeight: 18,
    },
    error: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
    },

    /* ── The week ── */
    strip: {
        borderBottomWidth: 1,
    },
    stripContent: {
        paddingHorizontal: Spacing.four,
    },
    dayColumn: {
        width: DayColumnWidth,
        alignItems: 'center',
        paddingBottom: Spacing.two,
    },
    dayDate: {
        marginTop: Spacing.one,
    },
    /** The mark under the day the screen is showing. */
    dayMark: {
        height: 2,
        alignSelf: 'stretch',
        marginTop: Spacing.two,
        marginHorizontal: Spacing.two,
    },

    /* ── The day ── */
    dayHeading: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two,
        paddingTop: Spacing.four,
        paddingBottom: Spacing.three,
    },
    dayCount: {
        fontSize: 11,
        lineHeight: 16,
    },
    progressTrack: {
        height: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    noChoresText: {
        paddingVertical: Spacing.three,
    },

    swipeableContainer: {
        overflow: 'hidden',
    },
    choreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    choreLabel: {
        flex: 1,
    },
    choreMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },

    // Assignee styling
    assigneeBadgeContainer: {
        paddingVertical: Spacing.three,
        paddingLeft: Spacing.three,
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        /** Outside the scroll view, so it clears the floating tab bar itself. */
        paddingBottom: BottomTabInset + Spacing.three,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: Spacing.three,
    },
    addButtonText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 13.5,
        lineHeight: 18,
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

    // Day selector in modal
    dayPillsContainer: {
        flexDirection: 'row',
        gap: Spacing.two,
        marginTop: Spacing.two,
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
    /** The plate is the same red in both schemes, so its label is too. */
    actionText: {
        color: Colors.light.background,
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        lineHeight: 15,
    },
});
