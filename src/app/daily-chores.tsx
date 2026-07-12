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
import { type ChoreItem } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChores } from '@/hooks/use-chores';
import { useTheme } from '@/hooks/use-theme';

interface ChoreRowProps {
    chore: ChoreItem;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const ChoreRow = React.memo(
    ({ chore, onToggle, onEdit, onDelete, theme }: ChoreRowProps) => {
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
    const { chores, addChore, toggleChore, deleteChore, editChore } =
        useChores();
    const [modalVisible, setModalVisible] = useState(false);
    const [choreText, setChoreText] = useState('');
    const [editingChore, setEditingChore] = useState<ChoreItem | null>(null);

    const doneCount = chores.filter((c) => c.done).length;
    const progress =
        chores.length > 0 ? Math.round((doneCount / chores.length) * 100) : 0;
    const hasChores = chores.length > 0;

    const openAddModal = () => {
        setEditingChore(null);
        setChoreText('');
        setModalVisible(true);
    };

    const openEditModal = (chore: ChoreItem) => {
        setEditingChore(chore);
        setChoreText(chore.label);
        setModalVisible(true);
    };

    const handleSave = () => {
        if (!choreText.trim()) return;

        if (editingChore) {
            editChore(editingChore.id, choreText.trim());
        } else {
            addChore(choreText.trim());
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
                                Tap the button below to start tracking your
                                chores for today
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
                                onEdit={() => openEditModal(chore)}
                                onDelete={() => deleteChore(chore.id)}
                            />
                        ))}
                </ScrollView>

                {/* Add chore button */}
                <View style={styles.addButtonContainer}>
                    <Pressable
                        onPress={openAddModal}
                        accessibilityLabel="Add a chore"
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
                            Add Chore
                        </ThemedText>
                    </Pressable>
                </View>
            </SafeAreaView>

            {/* Add / Edit chore modal */}
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
                                {editingChore ? 'Edit Chore' : 'Add Chore'}
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
                            <View style={styles.inputSection}>
                                <ThemedText
                                    type="default"
                                    style={styles.modalLabel}>
                                    Chore description
                                </ThemedText>

                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[
                                            styles.choreInput,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                                color: theme.text,
                                            },
                                        ]}
                                        placeholder="Type chore description here..."
                                        placeholderTextColor={
                                            theme.textSecondary
                                        }
                                        value={choreText}
                                        onChangeText={setChoreText}
                                        onSubmitEditing={handleSave}
                                        returnKeyType="done"
                                        autoFocus
                                        accessibilityLabel="Chore description input"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal footer */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={handleSave}
                                disabled={!choreText.trim()}
                                accessibilityLabel="Save chore"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.doneButton,
                                    {
                                        backgroundColor: choreText.trim()
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
                                            color: choreText.trim()
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
        gap: Spacing.three,
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
    choreInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
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
