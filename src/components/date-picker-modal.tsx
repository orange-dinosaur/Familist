import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatDateString, getRelativeDateString } from '@/constants/dates';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** Weeks start on Monday, so Sunday moves to the end of the row. */
function weekdayIndex(date: Date): number {
    return (date.getDay() + 6) % 7;
}

const weekdayLabels = (() => {
    const labels: string[] = [];
    /** The first of January 2024 was a Monday. */
    const d = new Date(2024, 0, 1);
    for (let i = 0; i < 7; i++) {
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        d.setDate(d.getDate() + 1);
    }
    return labels;
})();

function monthOf(day: string | null): Date {
    if (day) {
        const [year, month] = day.split('-').map(Number);
        return new Date(year, month - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** The days of `month`, padded with nulls so the first one lands on its weekday. */
function monthGrid(month: Date): (string | null)[] {
    const cells: (string | null)[] = new Array(weekdayIndex(month)).fill(null);
    const d = new Date(month);
    while (d.getMonth() === month.getMonth()) {
        cells.push(formatDateString(d));
        d.setDate(d.getDate() + 1);
    }
    return cells;
}

interface DatePickerModalProps {
    visible: boolean;
    value: string | null;
    onSelect: (day: string) => void;
    onClose: () => void;
}

export function DatePickerModal({
    visible,
    value,
    onSelect,
    onClose,
}: DatePickerModalProps) {
    const theme = useTheme();
    const scheme = useColorScheme();
    const [month, setMonth] = useState(() => monthOf(value));

    useEffect(() => {
        if (visible) setMonth(monthOf(value));
    }, [visible, value]);

    const todayStr = getRelativeDateString(0);
    const monthTitle = month.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    });

    const shiftMonth = (offset: number) =>
        setMonth(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() + offset, 1)
        );

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}>
            <BlurView
                intensity={40}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={styles.overlay}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                />
                <View
                    style={[
                        styles.content,
                        { backgroundColor: theme.background },
                    ]}>
                    <View style={styles.header}>
                        <Pressable
                            onPress={() => shiftMonth(-1)}
                            hitSlop={8}
                            accessibilityLabel="Previous month"
                            accessibilityRole="button">
                            <SymbolView
                                name={{
                                    ios: 'chevron.left',
                                    web: 'chevron_left',
                                }}
                                tintColor={theme.text}
                                size={24}
                            />
                        </Pressable>
                        <ThemedText type="subtitle" style={styles.monthTitle}>
                            {monthTitle}
                        </ThemedText>
                        <Pressable
                            onPress={() => shiftMonth(1)}
                            hitSlop={8}
                            accessibilityLabel="Next month"
                            accessibilityRole="button">
                            <SymbolView
                                name={{
                                    ios: 'chevron.right',
                                    web: 'chevron_right',
                                }}
                                tintColor={theme.text}
                                size={24}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.grid}>
                        {weekdayLabels.map((label) => (
                            <View key={label} style={styles.cell}>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary"
                                    style={styles.weekdayLabel}>
                                    {label}
                                </ThemedText>
                            </View>
                        ))}
                        {monthGrid(month).map((day, index) => {
                            if (!day) {
                                return (
                                    <View
                                        key={`pad-${index}`}
                                        style={styles.cell}
                                    />
                                );
                            }
                            const isSelected = day === value;
                            return (
                                <View key={day} style={styles.cell}>
                                    <Pressable
                                        onPress={() => onSelect(day)}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            selected: isSelected,
                                        }}
                                        style={[
                                            styles.day,
                                            isSelected && {
                                                backgroundColor: theme.text,
                                            },
                                            !isSelected &&
                                                day === todayStr && {
                                                    backgroundColor:
                                                        theme.backgroundElement,
                                                },
                                        ]}>
                                        <ThemedText
                                            style={[
                                                styles.dayText,
                                                {
                                                    color: isSelected
                                                        ? theme.background
                                                        : theme.text,
                                                },
                                            ]}>
                                            {Number(day.slice(-2))}
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>

                    <Pressable
                        onPress={onClose}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                        style={[
                            styles.closeButton,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <ThemedText style={styles.closeButtonText}>
                            Cancel
                        </ThemedText>
                    </Pressable>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: Spacing.four,
        gap: Spacing.three,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two,
    },
    monthTitle: {
        flex: 1,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.half,
    },
    weekdayLabel: {
        fontWeight: '600',
    },
    day: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    dayText: {
        fontSize: 15,
        fontWeight: '600',
    },
    closeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.three,
        borderRadius: 14,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
