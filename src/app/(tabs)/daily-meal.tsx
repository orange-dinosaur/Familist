import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    getDateRange,
    formatLocalDateString,
    getRelativeDateString,
} from '@/constants/dates';
import { type MealItem } from '@/constants/types';
import {
    BottomTabInset,
    Fonts,
    MaxContentWidth,
    Spacing,
} from '@/constants/theme';
import { useMeals } from '@/hooks/use-meals';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';

const timeLabel: Record<MealItem['time'], string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
};

const MEAL_TIMES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

/** Seven of these fill a phone; the rest of the range scrolls. */
const DayColumnWidth = 48;

/** The day the screen is showing, written out: "Monday 8 September". */
function longDay(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        weekday: 'long',
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

type MealTime = MealItem['time'];

export default function DailyMealScreen() {
    const theme = useTheme();
    const { meals, loading, error, clearError, addMeal, removeMeal } =
        useMeals();
    const { canManageContent } = usePermissions();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTime, setSelectedTime] = useState<MealTime | null>(null);
    const [dishName, setDishName] = useState('');
    const [isDayPreselected, setIsDayPreselected] = useState(false);

    const stripRef = useRef<ScrollView>(null);
    const todayStr = getRelativeDateString(0);
    const [selectedDay, setSelectedDay] = useState<string>(todayStr);

    const dates = getDateRange();
    const dayMeals = meals.filter((m) => m.day === selectedDay);

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

    const openModal = () => {
        setSelectedTime(null);
        setDishName('');
        setIsDayPreselected(false);
        clearError();
        setModalVisible(true);
    };

    const addDish = async () => {
        if (!selectedTime || !dishName.trim()) return;

        const newMeal: Omit<MealItem, 'id'> = {
            name: dishName.trim(),
            time: selectedTime,
            emoji: '',
            day: selectedDay,
        };

        if (!(await addMeal(newMeal))) return;

        setDishName('');

        if (isDayPreselected) {
            setModalVisible(false);
        }
    };

    const closeModal = () => {
        clearError();
        setModalVisible(false);
    };

    const handleDone = async () => {
        if (dishName.trim() && selectedTime) {
            await addDish();
        } else {
            closeModal();
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

                <View style={styles.header}>
                    <View style={styles.headerTitle}>
                        <ThemedText type="title">Meals</ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.subtitle}>
                            {longDay(selectedDay)}
                        </ThemedText>
                    </View>
                    <View style={styles.headerFigure}>
                        <ThemedText type="figureLarge" themeColor="memberSage">
                            {dayMeals.length}
                        </ThemedText>
                        <ThemedText type="label" themeColor="textMuted">
                            Planned
                        </ThemedText>
                    </View>
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
                                            ? `Today, ${longDay(day)}`
                                            : longDay(day)
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
                    {dayMeals.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            type="small"
                            style={styles.emptyText}>
                            {loading
                                ? ''
                                : canManageContent
                                  ? 'Nothing planned for this day yet.'
                                  : 'No meals planned for this day.'}
                        </ThemedText>
                    ) : (
                        MEAL_TIMES.map((time) => {
                            const timeMeals = dayMeals.filter(
                                (m) => m.time === time
                            );
                            if (timeMeals.length === 0) return null;
                            return timeMeals.map((meal) => (
                                <View
                                    key={meal.id}
                                    style={[
                                        styles.mealRow,
                                        {
                                            borderBottomColor: `${theme.text}1A`,
                                        },
                                    ]}>
                                    <ThemedText
                                        type="label"
                                        themeColor="textSecondary"
                                        style={styles.mealTime}>
                                        {timeLabel[time]}
                                    </ThemedText>
                                    <ThemedText
                                        type="small"
                                        style={styles.mealName}>
                                        {meal.name}
                                    </ThemedText>
                                    {canManageContent && (
                                        <Pressable
                                            onPress={() => removeMeal(meal.id)}
                                            hitSlop={8}
                                            accessibilityLabel={`Remove ${meal.name}`}
                                            accessibilityRole="button">
                                            <SymbolView
                                                name={{
                                                    ios: 'xmark',
                                                    web: 'close',
                                                }}
                                                tintColor={theme.textSecondary}
                                                size={14}
                                            />
                                        </Pressable>
                                    )}
                                </View>
                            ));
                        })
                    )}
                </ScrollView>

                {/* Add meal button */}
                {canManageContent && (
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
                            <ThemedText
                                style={[
                                    styles.addButtonText,
                                    { color: theme.background },
                                ]}>
                                Add a meal
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
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
                            <ThemedText type="figureLarge">
                                Add a meal
                            </ThemedText>
                            <Pressable
                                onPress={closeModal}
                                hitSlop={8}
                                accessibilityLabel="Close"
                                accessibilityRole="button">
                                <SymbolView
                                    name={{ ios: 'xmark', web: 'close' }}
                                    tintColor={theme.textSecondary}
                                    size={16}
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
                                <View style={styles.modalSection}>
                                    <ThemedText
                                        type="label"
                                        themeColor="textSecondary">
                                        Day
                                    </ThemedText>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={
                                            styles.modalStrip
                                        }>
                                        {dates.map((day) => {
                                            const { initial, date } =
                                                dayColumn(day);
                                            const isSelected =
                                                selectedDay === day;
                                            const isToday = day === todayStr;
                                            const dayColor = isToday
                                                ? 'link'
                                                : isSelected
                                                  ? 'text'
                                                  : 'textMuted';
                                            return (
                                                <Pressable
                                                    key={day}
                                                    onPress={() =>
                                                        setSelectedDay(day)
                                                    }
                                                    accessibilityLabel={
                                                        isToday
                                                            ? `Today, ${longDay(day)}`
                                                            : longDay(day)
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
                                                                backgroundColor:
                                                                    theme.text,
                                                            },
                                                        ]}
                                                    />
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Step 2: Choose meal type */}
                            <View style={styles.modalSection}>
                                <ThemedText
                                    type="label"
                                    themeColor="textSecondary">
                                    Meal time
                                </ThemedText>
                                <View style={styles.mealTypeRow}>
                                    {MEAL_TIMES.map((time) => {
                                        const isSelected =
                                            selectedTime === time;
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
                                                style={styles.mealType}>
                                                <ThemedText
                                                    type="label"
                                                    themeColor={
                                                        isSelected
                                                            ? 'text'
                                                            : 'textMuted'
                                                    }>
                                                    {timeLabel[time]}
                                                </ThemedText>
                                                <View
                                                    style={[
                                                        styles.dayMark,
                                                        isSelected && {
                                                            backgroundColor:
                                                                theme.text,
                                                        },
                                                    ]}
                                                />
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Step 3: Add dishes (only when type selected) */}
                            {selectedTime && (
                                <View style={styles.modalSection}>
                                    <ThemedText
                                        type="label"
                                        themeColor="textSecondary">
                                        {timeLabel[selectedTime]} on{' '}
                                        {formatLocalDateString(selectedDay)}
                                    </ThemedText>

                                    <View style={styles.dishInputRow}>
                                        <TextInput
                                            style={[
                                                styles.dishInput,
                                                {
                                                    borderBottomColor: `${theme.text}29`,
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
                                            {meals
                                                .filter(
                                                    (m) =>
                                                        m.day === selectedDay &&
                                                        m.time === selectedTime
                                                )
                                                .map((meal) => {
                                                    return (
                                                        <View
                                                            key={`modal-${meal.id}`}
                                                            style={[
                                                                styles.addedDishRow,
                                                                {
                                                                    borderBottomColor: `${theme.text}1A`,
                                                                },
                                                            ]}>
                                                            <ThemedText
                                                                type="small"
                                                                style={
                                                                    styles.mealName
                                                                }>
                                                                {meal.name}
                                                            </ThemedText>
                                                            <Pressable
                                                                onPress={() =>
                                                                    removeMeal(
                                                                        meal.id
                                                                    )
                                                                }
                                                                hitSlop={8}
                                                                accessibilityLabel={`Remove ${meal.name}`}
                                                                accessibilityRole="button">
                                                                <SymbolView
                                                                    name={{
                                                                        ios: 'xmark',
                                                                        web: 'close',
                                                                    }}
                                                                    tintColor={
                                                                        theme.textSecondary
                                                                    }
                                                                    size={14}
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
                            {error && (
                                <ThemedText
                                    type="small"
                                    style={{ color: theme.destructive }}>
                                    {error}
                                </ThemedText>
                            )}
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
        paddingBottom: BottomTabInset + Spacing.three,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    headerTitle: {
        flex: 1,
    },
    headerFigure: {
        alignItems: 'flex-end',
        paddingBottom: Spacing.half,
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
    emptyText: {
        paddingVertical: Spacing.three,
    },
    mealRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    mealTime: {
        width: 64,
    },
    mealName: {
        flex: 1,
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        /** Outside the scroll view, so it clears the floating tab bar itself. */
        paddingBottom: BottomTabInset + Spacing.three,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
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
    modalScroll: {
        flex: 1,
    },
    modalScrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
    },
    modalSection: {
        paddingTop: Spacing.three,
        gap: Spacing.two,
    },
    modalStrip: {
        paddingTop: Spacing.one,
    },
    mealTypeRow: {
        flexDirection: 'row',
        paddingTop: Spacing.one,
    },
    mealType: {
        flex: 1,
        alignItems: 'center',
    },

    // Dish input
    dishInputRow: {
        flexDirection: 'row',
        gap: Spacing.two,
        alignItems: 'center',
        paddingTop: Spacing.two,
    },
    dishInput: {
        flex: 1,
        height: 44,
        borderBottomWidth: 1,
        fontFamily: Fonts.sansMedium,
        fontSize: 15,
    },
    addDishButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Added dishes list in modal
    addedDishList: {
        paddingTop: Spacing.two,
    },
    addedDishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
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
        borderRadius: 12,
        paddingVertical: Spacing.three,
    },
    doneButtonText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 13.5,
        lineHeight: 18,
    },
});
