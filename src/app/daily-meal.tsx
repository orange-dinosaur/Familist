import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import React, { useState, useRef } from 'react';
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
import {
    type MealItem,
    getDateRange,
    formatLocalDateString,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useMeals } from '@/hooks/use-meals';
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
    const { meals, addMeal, removeMeal } = useMeals();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTime, setSelectedTime] = useState<MealTime | null>(null);
    const [dishName, setDishName] = useState('');
    const [isDayPreselected, setIsDayPreselected] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const todayYOffsetRef = useRef<number | null>(null);
    const todayStr = getRelativeDateString(0);
    const [selectedDay, setSelectedDay] = useState<string>(todayStr);

    const dates = getDateRange();
    const hasMeals = meals.length > 0;

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

    const openModal = () => {
        setSelectedDay(todayStr);
        setSelectedTime(null);
        setDishName('');
        setIsDayPreselected(false);
        setModalVisible(true);
    };

    const openModalForDay = (day: string) => {
        setSelectedDay(day);
        setSelectedTime(null);
        setDishName('');
        setIsDayPreselected(true);
        setModalVisible(true);
    };

    const addDish = () => {
        if (!selectedTime || !dishName.trim()) return;

        const newMeal: MealItem = {
            name: dishName.trim(),
            time: selectedTime,
            emoji: '',
            day: selectedDay,
        };

        addMeal(newMeal);
        setDishName('');

        if (isDayPreselected) {
            setModalVisible(false);
        }
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const handleDone = () => {
        if (dishName.trim() && selectedTime) {
            addDish();
        } else {
            closeModal();
        }
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
                            Meals Plan
                        </ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {hasMeals
                                ? `${meals.length} dish${meals.length !== 1 ? 'es' : ''} planned in total`
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
                                meals for the week
                            </ThemedText>
                        </View>
                    )}

                    {/* Meal cards grouped by day */}
                    {dates.map((day) => {
                        const dayMeals = meals.filter((m) => m.day === day);
                        const isToday = day === todayStr;

                        // Group day meals by time slot
                        const grouped = dayMeals.reduce(
                            (acc, meal) => {
                                if (!acc[meal.time]) acc[meal.time] = [];
                                acc[meal.time].push(meal);
                                return acc;
                            },
                            {} as Record<string, MealItem[]>
                        );

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
                                        onPress={() => openModalForDay(day)}
                                        accessibilityLabel={`Add meal for ${formatLocalDateString(day)}`}
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

                                {/* Day Meals list */}
                                {dayMeals.length === 0 ? (
                                    <ThemedText
                                        themeColor="textSecondary"
                                        type="small"
                                        style={styles.noMealsText}>
                                        No meals planned for this day.
                                    </ThemedText>
                                ) : (
                                    <View style={styles.dayMealsContent}>
                                        {MEAL_TIMES.map((time) => {
                                            const timeMeals = grouped[time];
                                            if (!timeMeals) return null;
                                            return (
                                                <View
                                                    key={time}
                                                    style={styles.timeSection}>
                                                    <ThemedText
                                                        type="small"
                                                        style={[
                                                            styles.timeSectionTitle,
                                                            {
                                                                color: theme.textSecondary,
                                                            },
                                                        ]}>
                                                        {timeLabel[time]}
                                                    </ThemedText>
                                                    {timeMeals.map((meal) => {
                                                        const globalIndex =
                                                            meals.findIndex(
                                                                (m) =>
                                                                    m.name ===
                                                                        meal.name &&
                                                                    m.time ===
                                                                        meal.time &&
                                                                    m.day ===
                                                                        meal.day
                                                            );
                                                        return (
                                                            <View
                                                                key={`${meal.day}-${meal.time}-${meal.name}-${globalIndex}`}
                                                                style={[
                                                                    styles.mealRow,
                                                                    {
                                                                        backgroundColor:
                                                                            theme.backgroundSelected,
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
                                                                            20
                                                                        }
                                                                    />
                                                                </Pressable>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
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
                                name={{ ios: 'fork.knife', web: 'restaurant' }}
                                tintColor={theme.textSecondary}
                                size={20}
                            />
                            <ThemedText themeColor="textSecondary" type="small">
                                {meals.length} meal
                                {meals.length !== 1 ? 's' : ''} planned in total
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

                            {/* Step 2: Choose meal type */}
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

                            {/* Step 3: Add dishes (only when type selected) */}
                            {selectedTime && (
                                <View style={styles.dishInputSection}>
                                    <ThemedText
                                        type="default"
                                        style={styles.modalLabel}>
                                        Add dishes to {timeLabel[selectedTime]}{' '}
                                        on {formatLocalDateString(selectedDay)}
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

                                    {/* Show dishes added for the selected day + time */}
                                    {meals.filter(
                                        (m) =>
                                            m.day === selectedDay &&
                                            m.time === selectedTime
                                    ).length > 0 && (
                                        <View style={styles.addedDishList}>
                                            <ThemedText
                                                type="small"
                                                themeColor="textSecondary"
                                                style={styles.addedDishHeader}>
                                                {timeLabel[selectedTime]} dishes
                                                on{' '}
                                                {formatLocalDateString(
                                                    selectedDay
                                                )}
                                            </ThemedText>
                                            {meals
                                                .filter(
                                                    (m) =>
                                                        m.day === selectedDay &&
                                                        m.time === selectedTime
                                                )
                                                .map((meal) => {
                                                    const globalIndex =
                                                        meals.findIndex(
                                                            (m) =>
                                                                m.name ===
                                                                    meal.name &&
                                                                m.time ===
                                                                    meal.time &&
                                                                m.day ===
                                                                    meal.day
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
                                                                    size={18}
                                                                />
                                                            </Pressable>
                                                        </View>
                                                    );
                                                })}
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {/* Done button */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={handleDone}
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
        paddingBottom: Spacing.one,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128, 128, 128, 0.1)',
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
    noMealsText: {
        fontStyle: 'italic',
        paddingVertical: Spacing.half,
    },
    dayMealsContent: {
        gap: Spacing.two,
    },
    timeSection: {
        gap: Spacing.one,
    },
    timeSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: Spacing.one,
    },

    mealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + Spacing.half,
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
        marginBottom: Spacing.two,
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
