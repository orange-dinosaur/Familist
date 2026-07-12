import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
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
import { type ChoreItem } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { PRESET_CHORES, useChores } from '@/hooks/use-chores';
import { useTheme } from '@/hooks/use-theme';

interface ChoreRowProps {
    chore: ChoreItem;
    onToggle: () => void;
    onDelete: () => void;
    theme: any;
}

const ChoreRow = React.memo(
    ({ chore, onToggle, onDelete, theme }: ChoreRowProps) => {
        const swipeableRef = React.useRef<Swipeable>(null);

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
                </Pressable>
            </Swipeable>
        );
    }
);

ChoreRow.displayName = 'ChoreRow';

export default function DailyChoresScreen() {
    const theme = useTheme();
    const { chores, toggleChore, deleteChore, toggleChoreActive } = useChores();
    const [modalVisible, setModalVisible] = useState(false);

    const doneCount = chores.filter((c) => c.done).length;
    const progress =
        chores.length > 0 ? Math.round((doneCount / chores.length) * 100) : 0;
    const hasChores = chores.length > 0;

    const isChoreActive = (label: string) =>
        chores.some((c) => c.label === label);

    const openAddModal = () => {
        setModalVisible(true);
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
                            Daily Chores
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {hasChores
                                ? `${doneCount} of ${chores.length} completed`
                                : 'No chores today'}
                        </ThemedText>
                    </View>

                    {/* Progress bar */}
                    {hasChores && (
                        <View
                            style={[
                                styles.progressTrack,
                                { backgroundColor: theme.backgroundElement },
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

                    {/* Empty state */}
                    {!hasChores && (
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
                                Tap the button below to select chores for today
                            </ThemedText>
                        </View>
                    )}

                    {/* Chore list */}
                    {hasChores &&
                        chores.map((chore) => (
                            <ChoreRow
                                key={chore.id}
                                chore={chore}
                                theme={theme}
                                onToggle={() => toggleChore(chore.id)}
                                onDelete={() => deleteChore(chore.id)}
                            />
                        ))}
                </ScrollView>

                {/* Add chore button */}
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
                            <View style={styles.inputSection}>
                                <ThemedText
                                    themeColor="textSecondary"
                                    type="small"
                                    style={styles.modalInstructionText}>
                                    Select which chores are active for today:
                                </ThemedText>

                                <View style={styles.pillsGrid}>
                                    {PRESET_CHORES.map((preset) => {
                                        const active = isChoreActive(preset);
                                        return (
                                            <Pressable
                                                key={preset}
                                                onPress={() =>
                                                    toggleChoreActive(preset)
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
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: Spacing.three,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
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
        width: 80,
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
        gap: Spacing.three,
        paddingBottom: Spacing.four,
    },
    inputSection: {
        gap: Spacing.two,
    },
    modalInstructionText: {
        fontWeight: '500',
        marginBottom: Spacing.one,
    },
    pillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    presetChorePill: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetChoreText: {
        fontSize: 14,
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
});
