import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dailyMeals, type MealItem } from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const timeLabel: Record<MealItem['time'], string> = {
    breakfast: '🌅 Breakfast',
    lunch: '☀️ Lunch',
    snack: '🍪 Snack',
    dinner: '🌙 Dinner',
};

const MEAL_TIMES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export default function DailyMealScreen() {
    const theme = useTheme();

    // Group meals by time slot
    const grouped = dailyMeals.reduce(
        (acc, meal) => {
            if (!acc[meal.time]) acc[meal.time] = [];
            acc[meal.time].push(meal);
            return acc;
        },
        {} as Record<string, MealItem[]>
    );

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
                            Today&apos;s meal plan
                        </ThemedText>
                    </View>

                    {/* Meal cards grouped by time */}
                    {MEAL_TIMES.map((time) => {
                        const meals = grouped[time];
                        if (!meals) return null;
                        return (
                            <View key={time} style={styles.section}>
                                <ThemedText
                                    type="default"
                                    style={styles.sectionTitle}>
                                    {timeLabel[time]}
                                </ThemedText>
                                {meals.map((meal, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.mealRow,
                                            {
                                                backgroundColor:
                                                    theme.backgroundElement,
                                            },
                                        ]}>
                                        <ThemedText style={styles.emoji}>
                                            {meal.emoji}
                                        </ThemedText>
                                        <ThemedText
                                            type="default"
                                            style={styles.mealName}>
                                            {meal.name}
                                        </ThemedText>
                                    </View>
                                ))}
                            </View>
                        );
                    })}

                    {/* Summary footer */}
                    <View
                        style={[
                            styles.summaryCard,
                            { backgroundColor: theme.backgroundElement },
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
                            {dailyMeals.length} meals planned for today
                        </ThemedText>
                    </View>
                </ScrollView>
            </SafeAreaView>
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
    emoji: {
        fontSize: 24,
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
});
