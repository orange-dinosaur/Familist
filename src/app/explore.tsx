import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    paymentDeadlines,
    sharedLinks,
    subscriptions,
} from '@/constants/mock-data';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function formatDueDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IT', { month: 'short', day: 'numeric' });
}

export default function ExploreScreen() {
    const theme = useTheme();

    const totalMonthly = subscriptions
        .filter((s) => s.cycle === 'monthly')
        .reduce(
            (sum, s) =>
                sum + parseFloat(s.price.replace('€', '').replace(',', '')),
            0
        );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.pageTitle}>
                        Other
                    </ThemedText>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* ─── Subscriptions ─── */}
                    <View style={styles.sectionHeader}>
                        <SymbolView
                            name={{
                                ios: 'creditcard.fill',
                                web: 'credit_card',
                            }}
                            tintColor={theme.text}
                            size={18}
                        />
                        <ThemedText type="default" style={styles.sectionTitle}>
                            Subscriptions
                        </ThemedText>
                    </View>

                    {subscriptions.map((sub, i) => (
                        <Pressable
                            key={`sub-${i}`}
                            style={({ pressed }) => [
                                styles.row,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    {
                                        backgroundColor:
                                            theme.backgroundSelected,
                                    },
                                ]}>
                                <SymbolView
                                    name={sub.icon}
                                    tintColor={theme.text}
                                    size={18}
                                />
                            </View>
                            <View style={styles.rowContent}>
                                <ThemedText type="default">
                                    {sub.name}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    {sub.cycle}
                                </ThemedText>
                            </View>
                            <ThemedText type="default" style={styles.priceText}>
                                {sub.price}
                            </ThemedText>
                        </Pressable>
                    ))}

                    <View
                        style={[
                            styles.totalRow,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <ThemedText type="small" themeColor="textSecondary">
                            Monthly total
                        </ThemedText>
                        <ThemedText type="default" style={styles.totalAmount}>
                            €{totalMonthly.toFixed(2)}
                        </ThemedText>
                    </View>

                    {/* ─── Payment Deadlines ─── */}
                    <View
                        style={[
                            styles.sectionHeader,
                            { marginTop: Spacing.three },
                        ]}>
                        <SymbolView
                            name={{
                                ios: 'calendar.badge.exclamationmark',
                                web: 'event_busy',
                            }}
                            tintColor={theme.text}
                            size={18}
                        />
                        <ThemedText type="default" style={styles.sectionTitle}>
                            Payment Deadlines
                        </ThemedText>
                    </View>

                    {paymentDeadlines.map((payment, i) => (
                        <View
                            key={`pay-${i}`}
                            style={[
                                styles.row,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: payment.isPaid
                                        ? 'checkmark.circle.fill'
                                        : 'clock.fill',
                                    web: payment.isPaid
                                        ? 'check_circle'
                                        : 'schedule',
                                }}
                                tintColor={
                                    payment.isPaid
                                        ? theme.textSecondary
                                        : theme.text
                                }
                                size={20}
                            />
                            <View style={styles.rowContent}>
                                <ThemedText
                                    type="default"
                                    themeColor={
                                        payment.isPaid
                                            ? 'textSecondary'
                                            : 'text'
                                    }
                                    style={
                                        payment.isPaid
                                            ? styles.strikethrough
                                            : undefined
                                    }>
                                    {payment.name}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    Due {formatDueDate(payment.dueDate)}
                                </ThemedText>
                            </View>
                            <ThemedText
                                type="default"
                                themeColor={
                                    payment.isPaid ? 'textSecondary' : 'text'
                                }>
                                {payment.amount}
                            </ThemedText>
                        </View>
                    ))}

                    {/* ─── Shared Links ─── */}
                    <View
                        style={[
                            styles.sectionHeader,
                            { marginTop: Spacing.three },
                        ]}>
                        <SymbolView
                            name={{ ios: 'link', web: 'link' }}
                            tintColor={theme.text}
                            size={18}
                        />
                        <ThemedText type="default" style={styles.sectionTitle}>
                            Shared Links
                        </ThemedText>
                    </View>

                    {sharedLinks.map((link, i) => (
                        <Pressable
                            key={`link-${i}`}
                            style={({ pressed }) => [
                                styles.row,
                                {
                                    backgroundColor: theme.backgroundElement,
                                },
                                pressed && {
                                    backgroundColor: theme.backgroundSelected,
                                },
                            ]}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    {
                                        backgroundColor:
                                            theme.backgroundSelected,
                                    },
                                ]}>
                                <SymbolView
                                    name={{
                                        ios: 'link',
                                        web: 'link',
                                    }}
                                    tintColor={theme.text}
                                    size={16}
                                />
                            </View>
                            <View style={styles.rowContent}>
                                <ThemedText type="default">
                                    {link.title}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    Added by {link.addedBy}
                                </ThemedText>
                            </View>
                            <SymbolView
                                name={{
                                    ios: 'arrow.up.right',
                                    web: 'open_in_new',
                                }}
                                tintColor={theme.textSecondary}
                                size={14}
                            />
                        </Pressable>
                    ))}
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
        gap: Spacing.two,
    },
    header: {
        paddingTop: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
        gap: Spacing.one,
    },
    pageTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        marginTop: Spacing.one,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 14,
        padding: Spacing.three,
    },
    rowContent: {
        flex: 1,
        gap: 2,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceText: {
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        padding: Spacing.three,
    },
    totalAmount: {
        fontWeight: '700',
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
});
