import { SymbolView } from 'expo-symbols';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    AmountField,
    DateRow,
    EmojiField,
    FormField,
    FormSheet,
    MemberPicker,
    OptionTabs,
} from '@/components/form-sheet';
import { MemberAvatar } from '@/components/member-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CURRENCIES, type Currency } from '@/constants/currencies';
import {
    formatDaysUntil,
    formatShortDateString,
    getRelativeDateString,
    monthOf,
} from '@/constants/dates';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { type SubscriptionItem } from '@/constants/types';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';
import { usePermissions } from '@/hooks/use-permissions';
import {
    SubscriptionsProvider,
    useSubscriptions,
} from '@/hooks/use-subscriptions';

import { formatAmount, parseAmount } from '@/utils/money';
import {
    byRenewal,
    cycleLabel,
    monthlyTotal,
    SUBSCRIPTION_CYCLES,
} from '@/utils/subscription';

interface SubscriptionRowProps {
    subscription: SubscriptionItem;
    canManage: boolean;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const SubscriptionRow = React.memo(
    ({
        subscription,
        canManage,
        onEdit,
        onDelete,
        theme,
    }: SubscriptionRowProps) => {
        const { members } = useMembers();
        const swipeableRef = useRef<Swipeable>(null);

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
                            {
                                transform: [{ translateX: trans }],
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <Pressable
                            style={styles.actionPressable}
                            onPress={() => {
                                swipeableRef.current?.close();
                                onEdit();
                            }}>
                            <SymbolView
                                name={{ ios: 'pencil', web: 'edit' }}
                                tintColor={theme.text}
                                size={18}
                            />
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    { color: theme.text },
                                ]}>
                                Edit
                            </ThemedText>
                        </Pressable>
                    </Animated.View>

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
                                name={{ ios: 'trash', web: 'delete' }}
                                tintColor={Colors.light.background}
                                size={18}
                            />
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    { color: Colors.light.background },
                                ]}>
                                Delete
                            </ThemedText>
                        </Pressable>
                    </Animated.View>
                </View>
            );
        };

        const payer = members.find((m) => m.id === subscription.payerId);
        const due = formatDaysUntil(subscription.nextRenewal);
        const overdue = subscription.nextRenewal < getRelativeDateString(0);

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={canManage ? renderRightActions : undefined}
                containerStyle={styles.swipeableContainer}>
                <View
                    style={[
                        styles.row,
                        { borderBottomColor: `${theme.text}17` },
                    ]}>
                    <View style={styles.rowTextColumn}>
                        <ThemedText type="small">
                            {subscription.emoji
                                ? `${subscription.emoji} ${subscription.name}`
                                : subscription.name}
                        </ThemedText>
                        <ThemedText
                            style={[
                                styles.rowCycle,
                                {
                                    color: overdue
                                        ? theme.priorityHigh
                                        : theme.textMuted,
                                },
                            ]}>
                            {cycleLabel(subscription.cycle)} ·{' '}
                            {overdue
                                ? due
                                : `renews ${formatShortDateString(subscription.nextRenewal)}`}
                        </ThemedText>
                    </View>

                    <ThemedText type="figure">
                        {formatAmount(
                            subscription.amount,
                            subscription.currency
                        )}
                    </ThemedText>
                    {payer && <MemberAvatar member={payer} size={22} />}
                </View>
            </Swipeable>
        );
    }
);

SubscriptionRow.displayName = 'SubscriptionRow';

function SectionHeading({ label, count }: { label: string; count: number }) {
    const theme = useTheme();

    return (
        <View
            style={[
                styles.sectionHeader,
                { borderTopColor: `${theme.text}29` },
            ]}>
            <ThemedText type="label">{label}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sectionCount}>
                {count}
            </ThemedText>
        </View>
    );
}

function Subscriptions() {
    const theme = useTheme();
    const {
        subscriptions,
        loading,
        error,
        clearError,
        addSubscription,
        editSubscription,
        deleteSubscription,
    } = useSubscriptions();
    const { canManageContent } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<SubscriptionItem | null>(null);

    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
    const [cycle, setCycle] = useState<SubscriptionItem['cycle']>('monthly');
    const [nextRenewal, setNextRenewal] = useState(getRelativeDateString(0));
    const [payerId, setPayerId] = useState<string | undefined>(undefined);

    const listed = [...subscriptions].sort(byRenewal);
    /** Anything not yet charged this month, overdue renewals included. */
    const thisMonth = monthOf(getRelativeDateString(0));
    const soon = listed.filter((one) => monthOf(one.nextRenewal) <= thisMonth);
    const later = listed.filter((one) => monthOf(one.nextRenewal) > thisMonth);
    const total = monthlyTotal(subscriptions);
    const minorUnits = parseAmount(amount);
    const complete = name.trim().length > 0 && minorUnits !== null;

    const openAddModal = () => {
        setEditing(null);
        setName('');
        setEmoji('');
        setAmount('');
        setCurrency(CURRENCIES[0]);
        setCycle('monthly');
        setNextRenewal(getRelativeDateString(0));
        setPayerId(undefined);
        clearError();
        setModalVisible(true);
    };

    const openEditModal = (subscription: SubscriptionItem) => {
        setEditing(subscription);
        setName(subscription.name);
        setEmoji(subscription.emoji);
        setAmount((subscription.amount / 100).toFixed(2));
        setCurrency(subscription.currency);
        setCycle(subscription.cycle);
        setNextRenewal(subscription.nextRenewal);
        setPayerId(subscription.payerId ?? undefined);
        clearError();
        setModalVisible(true);
    };

    const closeModal = () => {
        clearError();
        setModalVisible(false);
    };

    const save = async () => {
        if (minorUnits === null || !name.trim()) return;

        const input = {
            name: name.trim(),
            emoji,
            amount: minorUnits,
            currency,
            cycle,
            nextRenewal,
            payerId,
        };

        const saved = editing
            ? await editSubscription(editing.id, input)
            : await addSubscription(input);

        if (saved) setModalVisible(false);
    };

    const renderRow = (subscription: SubscriptionItem) => (
        <SubscriptionRow
            key={subscription.id}
            subscription={subscription}
            theme={theme}
            canManage={canManageContent}
            onEdit={() => openEditModal(subscription)}
            onDelete={() => deleteSubscription(subscription.id)}
        />
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader
                    title="Subscriptions"
                    subtitle={
                        loading ? undefined : `${subscriptions.length} active`
                    }
                    figure={
                        total
                            ? {
                                  value: formatAmount(
                                      total.amount,
                                      total.currency
                                  ),
                                  label: 'Per month',
                              }
                            : undefined
                    }
                />

                {error && !modalVisible && (
                    <ThemedText
                        type="small"
                        style={[
                            styles.listError,
                            { color: theme.destructive },
                        ]}>
                        {error}
                    </ThemedText>
                )}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {listed.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.emptyText}>
                            {loading ? '' : 'Nothing to renew yet.'}
                        </ThemedText>
                    ) : (
                        <>
                            {soon.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Renewing this month"
                                        count={soon.length}
                                    />
                                    {soon.map(renderRow)}
                                </>
                            )}
                            {later.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Later"
                                        count={later.length}
                                    />
                                    {later.map(renderRow)}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                {canManageContent && (
                    <View style={styles.addButtonContainer}>
                        <Pressable
                            onPress={openAddModal}
                            accessibilityLabel="Add subscription"
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
                                Add subscription
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>

            <FormSheet
                visible={modalVisible}
                title={editing ? 'Edit subscription' : 'Add a subscription'}
                onClose={closeModal}
                actionLabel="Save"
                onAction={save}
                actionDisabled={!complete}
                error={error}>
                <View style={styles.nameRow}>
                    <EmojiField
                        placeholder="🎬"
                        value={emoji}
                        onChangeText={setEmoji}
                    />
                    <View style={styles.nameField}>
                        <FormField
                            label="Name"
                            placeholder="What is it for..."
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                </View>

                <AmountField
                    label="Amount"
                    placeholder="9.99"
                    value={amount}
                    onChangeText={setAmount}
                    currency={currency}
                    onChooseCurrency={setCurrency}
                />
                <OptionTabs
                    label="Cycle"
                    options={SUBSCRIPTION_CYCLES}
                    chosen={cycle}
                    onChoose={setCycle}
                />
                <DateRow
                    label="Next renewal"
                    day={nextRenewal}
                    onChange={setNextRenewal}
                />
                <MemberPicker
                    label="Who pays"
                    chosenId={payerId}
                    onChoose={setPayerId}
                    noneLabel="Unassigned"
                />
            </FormSheet>
        </ThemedView>
    );
}

export default function SubscriptionsScreen() {
    return (
        <SubscriptionsProvider>
            <Subscriptions />
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
    },
    listError: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
    },
    emptyText: {
        paddingVertical: Spacing.three,
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

    // The list
    swipeableContainer: {
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    rowTextColumn: {
        flex: 1,
    },
    rowCycle: {
        fontFamily: Fonts.sansMedium,
        fontSize: 11,
        lineHeight: 15,
        marginTop: Spacing.one,
    },
    rightActionsContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        width: 80,
    },
    actionPressable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.half,
    },
    actionText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        lineHeight: 15,
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.three,
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

    // The add and edit form
    nameRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.three,
    },
    nameField: {
        flex: 1,
    },
});
