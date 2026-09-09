import { type Href, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    formatDaysUntil,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/dates';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ActivitiesProvider, useActivities } from '@/hooks/use-activities';
import { LoansProvider, useLoans } from '@/hooks/use-loans';
import { PaymentsProvider, usePayments } from '@/hooks/use-payments';
import { SharedLinksProvider, useSharedLinks } from '@/hooks/use-shared-links';
import {
    SubscriptionsProvider,
    useSubscriptions,
} from '@/hooks/use-subscriptions';
import { useTheme } from '@/hooks/use-theme';
import { byLastDone } from '@/utils/activity';
import { byRenewal } from '@/utils/subscription';

interface HubEntry {
    label: string;
    path: Href;
    /** The count the ledger is built around, and what it counts. */
    figure: number;
    unit: string;
    /** Where the ledger stands, or null where nothing worth saying. */
    state: string | null;
    /** Figures wait for the collection rather than showing a zero. */
    loading: boolean;
}

/** The month a `YYYY-MM-DD` day falls in, for comparing one against another. */
function monthOf(day: string): string {
    return day.slice(0, 7);
}

function useHubEntries(): HubEntry[] {
    const { subscriptions, loading: subscriptionsLoading } = useSubscriptions();
    const { activities, loading: activitiesLoading } = useActivities();
    const { payments, loading: paymentsLoading } = usePayments();
    const { sharedLinks, loading: linksLoading } = useSharedLinks();
    const { loans, loading: loansLoading } = useLoans();

    const nextRenewal = [...subscriptions].sort(byRenewal)[0];
    const oldest = [...activities].sort(byLastDone)[0];

    const thisMonth = monthOf(getRelativeDateString(0));
    const monthPayments = payments.filter(
        (one) => monthOf(one.dueOn) === thisMonth
    );
    const outstanding = monthPayments.filter((one) => !one.paid).length;

    const out = loans.filter((one) => !one.returned);
    const lent = out.filter((one) => one.direction === 'lent').length;

    return [
        {
            label: 'Subscriptions',
            path: '/subscriptions',
            figure: subscriptions.length,
            unit: 'active',
            state: nextRenewal
                ? `Next: ${nextRenewal.name}, ${formatShortDateString(nextRenewal.nextRenewal)}`
                : null,
            loading: subscriptionsLoading,
        },
        {
            label: 'When Did I Last',
            path: '/when-did-i-last',
            figure: activities.length,
            unit: 'tracked',
            state: oldest
                ? `Oldest: ${oldest.name}, ${oldest.lastDoneOn ? formatDaysUntil(oldest.lastDoneOn) : 'never'}`
                : null,
            loading: activitiesLoading,
        },
        {
            label: 'Payments',
            path: '/payments',
            figure: monthPayments.length,
            unit: 'this month',
            state: monthPayments.length
                ? outstanding
                    ? `${outstanding} outstanding`
                    : 'All settled'
                : null,
            loading: paymentsLoading,
        },
        {
            /** No link carries a date, so this row has only its count to give. */
            label: 'Shared Links',
            path: '/shared-links',
            figure: sharedLinks.length,
            unit: 'kept',
            state: null,
            loading: linksLoading,
        },
        {
            label: 'Loaned Items',
            path: '/loaned-items',
            figure: out.length,
            unit: 'out',
            state: out.length
                ? `${lent} lent · ${out.length - lent} borrowed`
                : null,
            loading: loansLoading,
        },
    ];
}

function OtherHub() {
    const theme = useTheme();
    const router = useRouter();
    const entries = useHubEntries();

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

                <View style={styles.header}>
                    <ThemedText type="title">Other</ThemedText>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    <View
                        style={[
                            styles.sectionHeader,
                            { borderTopColor: `${theme.text}29` },
                        ]}>
                        <ThemedText type="label">Household</ThemedText>
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.sectionCount}>
                            {entries.length} ledgers
                        </ThemedText>
                    </View>

                    {entries.map((entry) => (
                        <Pressable
                            key={entry.label}
                            onPress={() => router.navigate(entry.path)}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.row,
                                { borderBottomColor: `${theme.text}17` },
                                pressed && styles.pressed,
                            ]}>
                            <View style={styles.rowText}>
                                <ThemedText type="default">
                                    {entry.label}
                                </ThemedText>
                                {!entry.loading && entry.state && (
                                    <ThemedText
                                        type="labelSmall"
                                        themeColor="textMuted"
                                        style={styles.rowState}>
                                        {entry.state}
                                    </ThemedText>
                                )}
                            </View>

                            {!entry.loading && (
                                <View style={styles.rowFigure}>
                                    <ThemedText type="figureLarge">
                                        {entry.figure}
                                    </ThemedText>
                                    <ThemedText
                                        type="labelSmall"
                                        themeColor="textMuted"
                                        style={styles.rowUnit}>
                                        {entry.unit}
                                    </ThemedText>
                                </View>
                            )}

                            <SymbolView
                                name={{
                                    ios: 'chevron.right',
                                    web: 'chevron_right',
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

/**
 * The hub reads every ledger it lists, so it carries all five collections.
 * They are the same providers each ledger screen mounts for itself.
 */
export default function OtherScreen() {
    return (
        <SubscriptionsProvider>
            <ActivitiesProvider>
                <PaymentsProvider>
                    <SharedLinksProvider>
                        <LoansProvider>
                            <OtherHub />
                        </LoansProvider>
                    </SharedLinksProvider>
                </PaymentsProvider>
            </ActivitiesProvider>
        </SubscriptionsProvider>
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
    header: {
        paddingTop: Spacing.three,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: BottomTabInset + Spacing.three,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two,
        borderTopWidth: 1,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two,
    },
    sectionCount: {
        fontSize: 11,
        lineHeight: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    rowText: {
        flex: 1,
    },
    rowState: {
        marginTop: Spacing.one + Spacing.half / 2,
    },
    rowFigure: {
        alignItems: 'flex-end',
    },
    rowUnit: {
        marginTop: Spacing.one + Spacing.half / 2,
    },
    pressed: {
        opacity: 0.6,
    },
});
