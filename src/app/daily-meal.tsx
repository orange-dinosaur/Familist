import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type MealItem } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const timeLabel: Record<MealItem['time'], string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
};

const MEAL_TIMES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

type MealTime = MealItem['time'];

export default function DailyMealScreen() {
    const theme = useTheme();

    const [meals, setMeals] = useState<MealItem[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTime, setSelectedTime] = useState<MealTime | null>(null);
    const [dishName, setDishName] = useState('');

    // Group meals by time slot
    const grouped = meals.reduce(
        (acc, meal) => {
            if (!acc[meal.time]) acc[meal.time] = [];
            acc[meal.time].push(meal);
            return acc;
        },
        {} as Record<string, MealItem[]>
    );

    const hasMeals = meals.length > 0;

    const openModal = () => {
        setSelectedTime(null);
        setDishName('');

        setModalVisible(true);
    };

    const addDish = () => {
        if (!selectedTime || !dishName.trim()) return;

        const newMeal: MealItem = {
            name: dishName.trim(),
            time: selectedTime,
            emoji: '',
        };

        setMeals((prev) => [...prev, newMeal]);
        setDishName('');
    };

    const removeMeal = (index: number) => {
        setMeals((prev) => prev.filter((_, i) => i !== index));
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
                            Daily Meal
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {hasMeals
                                ? `${meals.length} dish${meals.length !== 1 ? 'es' : ''} planned for today`
                                : 'No meals planned yet'}
                        </ThemedText>
                    </View>

                    {/* Empty state */}
                    {!hasMeals && (
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
                                Tap the button below to start planning your
                                meals for today
                            </ThemedText>
                        </View>
                    )}

                    {/* Meal cards grouped by time */}
                    {hasMeals &&
                        MEAL_TIMES.map((time) => {
                            const timeMeals = grouped[time];
                            if (!timeMeals) return null;
                            return (
                                <View key={time} style={styles.section}>
                                    <ThemedText
                                        type="default"
                                        style={styles.sectionTitle}>
                                        {timeLabel[time]}
                                    </ThemedText>
                                    {timeMeals.map((meal) => {
                                        const globalIndex = meals.findIndex(
                                            (m) =>
                                                m.name === meal.name &&
                                                m.time === meal.time
                                        );
                                        return (
                                            <View
                                                key={`${meal.time}-${meal.name}-${globalIndex}`}
                                                style={[
                                                    styles.mealRow,
                                                    {
                                                        backgroundColor:
                                                            theme.backgroundElement,
                                                    },
                                                ]}>
                                                <ThemedText
                                                    type="default"
                                                    style={styles.mealName}>
                                                    {meal.name}
                                                </ThemedText>
                                                <Pressable
                                                    onPress={() =>
                                                        removeMeal(globalIndex)
                                                    }
                                                    hitSlop={8}
                                                    accessibilityLabel={`Remove ${meal.name}`}
                                                    accessibilityRole="button">
                                                    <SymbolView
                                                        name={{
                                                            ios: 'xmark.circle.fill',
                                                            web: 'cancel',
                                                        }}
                                                        tintColor={
                                                            theme.textSecondary
                                                        }
                                                        size={20}
                                                    />
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })}

                    {/* Summary footer */}
                    {hasMeals && (
                        <View
                            style={[
                                styles.summaryCard,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                            ]}>
                            <SymbolView
                                name={
                                    Platform.select({
                                        ios: 'fork.knife',
                                        default: 'restaurant',
                                    }) as any
                                }
                                tintColor={theme.textSecondary}
                                size={20}
                            />
                            <ThemedText themeColor="textSecondary" type="small">
                                {meals.length} meal
                                {meals.length !== 1 ? 's' : ''} planned for
                                today
                            </ThemedText>
                        </View>
                    )}
                </ScrollView>

                {/* Add meal button */}
                <View style={styles.addButtonContainer}>
                    <Pressable
                        onPress={openModal}
                        accessibilityLabel="Add a meal"
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
                            Add Meal
                        </ThemedText>
                    </Pressable>
                </View>
            </SafeAreaView>

            {/* Add meal modal */}
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
                            <ThemedText type="subtitle">Add Meal</ThemedText>
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
                            {/* Step 1: Choose meal type */}
                            <ThemedText
                                type="default"
                                style={styles.modalLabel}>
                                Choose meal type
                            </ThemedText>
                            <View style={styles.mealTypeGrid}>
                                {MEAL_TIMES.map((time) => {
                                    const isSelected = selectedTime === time;
                                    return (
                                        <Pressable
                                            key={time}
                                            onPress={() =>
                                                setSelectedTime(time)
                                            }
                                            accessibilityLabel={`Select ${time}`}
                                            accessibilityRole="button"
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                            style={[
                                                styles.mealTypeCard,
                                                {
                                                    backgroundColor: isSelected
                                                        ? theme.backgroundSelected
                                                        : theme.backgroundElement,
                                                    borderColor: isSelected
                                                        ? theme.text
                                                        : 'transparent',
                                                },
                                            ]}>
                                            <ThemedText
                                                type="small"
                                                style={styles.mealTypeLabel}>
                                                {time.charAt(0).toUpperCase() +
                                                    time.slice(1)}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Step 2: Add dishes (only when type selected) */}
                            {selectedTime && (
                                <View style={styles.dishInputSection}>
                                    <ThemedText
                                        type="default"
                                        style={styles.modalLabel}>
                                        Add dishes to {selectedTime}
                                    </ThemedText>

                                    <View style={styles.dishInputRow}>
                                        <TextInput
                                            style={[
                                                styles.dishInput,
                                                {
                                                    backgroundColor:
                                                        theme.backgroundElement,
                                                    color: theme.text,
                                                },
                                            ]}
                                            placeholder="Dish name..."
                                            placeholderTextColor={
                                                theme.textSecondary
                                            }
                                            value={dishName}
                                            onChangeText={setDishName}
                                            onSubmitEditing={addDish}
                                            returnKeyType="done"
                                            autoFocus
                                            accessibilityLabel="Dish name"
                                        />
                                        <Pressable
                                            onPress={addDish}
                                            disabled={!dishName.trim()}
                                            accessibilityLabel="Add dish"
                                            accessibilityRole="button"
                                            style={({ pressed }) => [
                                                styles.addDishButton,
                                                {
                                                    backgroundColor:
                                                        dishName.trim()
                                                            ? theme.text
                                                            : theme.backgroundElement,
                                                },
                                                pressed && {
                                                    opacity: 0.8,
                                                },
                                            ]}>
                                            <SymbolView
                                                name={{
                                                    ios: 'plus',
                                                    web: 'add',
                                                }}
                                                tintColor={
                                                    dishName.trim()
                                                        ? theme.background
                                                        : theme.textSecondary
                                                }
                                                size={18}
                                            />
                                        </Pressable>
                                    </View>

                                    {/* Show dishes added in this session for the selected time */}
                                    {grouped[selectedTime] &&
                                        grouped[selectedTime].length > 0 && (
                                            <View style={styles.addedDishList}>
                                                <ThemedText
                                                    type="small"
                                                    themeColor="textSecondary"
                                                    style={
                                                        styles.addedDishHeader
                                                    }>
                                                    {timeLabel[selectedTime]}{' '}
                                                    dishes
                                                </ThemedText>
                                                {grouped[selectedTime].map(
                                                    (meal) => {
                                                        const globalIndex =
                                                            meals.findIndex(
                                                                (m) =>
                                                                    m.name ===
                                                                        meal.name &&
                                                                    m.time ===
                                                                        meal.time
                                                            );
                                                        return (
                                                            <View
                                                                key={`modal-${meal.time}-${meal.name}-${globalIndex}`}
                                                                style={[
                                                                    styles.addedDishRow,
                                                                    {
                                                                        backgroundColor:
                                                                            theme.backgroundElement,
                                                                    },
                                                                ]}>
                                                                <ThemedText
                                                                    type="default"
                                                                    style={
                                                                        styles.mealName
                                                                    }>
                                                                    {meal.name}
                                                                </ThemedText>
                                                                <Pressable
                                                                    onPress={() =>
                                                                        removeMeal(
                                                                            globalIndex
                                                                        )
                                                                    }
                                                                    hitSlop={8}
                                                                    accessibilityLabel={`Remove ${meal.name}`}
                                                                    accessibilityRole="button">
                                                                    <SymbolView
                                                                        name={{
                                                                            ios: 'xmark.circle.fill',
                                                                            web: 'cancel',
                                                                        }}
                                                                        tintColor={
                                                                            theme.textSecondary
                                                                        }
                                                                        size={
                                                                            18
                                                                        }
                                                                    />
                                                                </Pressable>
                                                            </View>
                                                        );
                                                    }
                                                )}
                                            </View>
                                        )}
                                </View>
                            )}
                        </ScrollView>

                        {/* Done button */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={closeModal}
                                accessibilityLabel="Done"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.doneButton,
                                    { backgroundColor: theme.text },
                                    pressed && { opacity: 0.8 },
                                ]}>
                                <ThemedText
                                    style={[
                                        styles.doneButtonText,
                                        { color: theme.background },
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
        paddingBottom: BottomTabInset + Spacing.four,
        gap: Spacing.three,
    },
    header: {
        paddingTop: Spacing.two,
        gap: Spacing.one,
    },
    pageTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    subtitle: {
        marginTop: -Spacing.one,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        borderRadius: 14,
        padding: Spacing.five,
        gap: Spacing.three,
    },

    emptyText: {
        textAlign: 'center',
        lineHeight: 22,
    },

    // Sections
    section: {
        gap: Spacing.two,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    mealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: Spacing.three,
        gap: Spacing.three,
    },

    mealName: {
        flex: 1,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        borderRadius: 14,
        padding: Spacing.three,
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
    mealTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    mealTypeCard: {
        flex: 1,
        minWidth: 140,
        alignItems: 'center',
        borderRadius: 14,
        padding: Spacing.three,
        gap: Spacing.one,
        borderWidth: 2,
    },

    mealTypeLabel: {
        fontWeight: '600',
    },

    // Dish input
    dishInputSection: {
        gap: Spacing.three,
    },
    dishInputRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        alignItems: 'center',
    },

    dishInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
    },
    addDishButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Added dishes list in modal
    addedDishList: {
        gap: Spacing.two,
    },
    addedDishHeader: {
        fontWeight: '600',
    },
    addedDishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: Spacing.two + Spacing.one,
        gap: Spacing.two,
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
});
