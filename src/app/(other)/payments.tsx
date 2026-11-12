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
    FormField,
    FormSheet,
    MemberPicker,
} from '@/components/form-sheet';
import { MemberAvatar } from '@/components/member-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CURRENCIES, type Currency } from '@/constants/currencies';
import {
    daysUntil,
    formatShortDateString,
    getRelativeDateString,
    monthName,
    monthOf,
} from '@/constants/dates';
import {
    Fonts,
    MaxContentWidth,
    Spacing,
    type ThemeColor,
} from '@/constants/theme';
import { type PaymentItem } from '@/constants/types';
import { useMembers } from '@/hooks/use-members';
import { PaymentsProvider, usePayments } from '@/hooks/use-payments';
import { usePermissions } from '@/hooks/use-permissions';
import {
    SubscriptionsProvider,
    useSubscriptions,
} from '@/hooks/use-subscriptions';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, parseAmount } from '@/utils/money';
import {
    byDue,
    type DueRow,
    nextRenewalAfter,
    paidInMonth,
    paymentRow,
    renewalRow,
    settledOn,
} from '@/utils/payment';

/** How long before a deadline the row starts warning about it. */
const DueSoonDays = 15;

/**
 * What the caption's colour says about a deadline, now that the date itself is
 * spelled out rather than described.
 */
function dueTone(row: DueRow, todayStr: string): ThemeColor {
    if (row.paid) return 'textMuted';
    if (row.dueOn < todayStr) return 'priorityHigh';
    return daysUntil(row.dueOn) <= DueSoonDays ? 'priorityMedium' : 'textMuted';
}

interface DueRowProps {
    row: DueRow;
    tone: ThemeColor;
    canManage: boolean;
    canTick: boolean;
    onTick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const PaymentRow = React.memo(
    ({
        row,
        tone,
        canManage,
        canTick,
        onTick,
        onEdit,
        onDelete,
        theme,
    }: DueRowProps) => {
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
                                style={{
                                    color: theme.text,
                                    fontSize: 11,
                                    fontWeight: '600',
                                }}>
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
                                tintColor={theme.background}
                                size={18}
                            />
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    { color: theme.background },
                                ]}>
                                Delete
                            </ThemedText>
                        </Pressable>
                    </Animated.View>
                </View>
            );
        };

        const payer = members.find((m) => m.id === row.payerId);

        /** A renewal is the subscription's own row; it is edited over there. */
        const swipeable = canManage && row.payment !== null;

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={swipeable ? renderRightActions : undefined}
                containerStyle={styles.swipeableContainer}>
                <View
                    style={[
                        styles.row,
                        { borderBottomColor: `${theme.text}17` },
                    ]}>
                    <Pressable
                        onPress={onTick}
                        disabled={!canTick}
                        accessibilityLabel={`Mark ${row.name} paid`}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.rowMain,
                            pressed && { opacity: 0.6 },
                        ]}>
                        <SymbolView
                            name={{
                                ios: row.paid
                                    ? 'checkmark.circle.fill'
                                    : 'circle',
                                web: row.paid
                                    ? 'check_circle'
                                    : 'radio_button_unchecked',
                            }}
                            tintColor={
                                row.paid || !canTick
                                    ? theme.textSecondary
                                    : theme.text
                            }
                            size={20}
                        />

                        <View style={styles.rowTextColumn}>
                            <ThemedText type="small">
                                {row.emoji
                                    ? `${row.emoji} ${row.name}`
                                    : row.name}
                            </ThemedText>
                            <ThemedText
                                themeColor={tone}
                                style={styles.rowWhen}>
                                {row.paid
                                    ? `Paid ${formatShortDateString(settledOn(row.payment!), true)}`
                                    : `Due ${formatShortDateString(row.dueOn, true)}`}
                                {row.subscription ? ' · renewal' : ''}
                            </ThemedText>
                        </View>
                    </Pressable>

                    <ThemedText type="figure">
                        {formatAmount(row.amount, row.currency)}
                    </ThemedText>
                    {payer && <MemberAvatar member={payer} size={22} />}
                </View>
            </Swipeable>
        );
    }
);

PaymentRow.displayName = 'PaymentRow';

interface SectionHeadingProps {
    label: string;
    value: string;
    /** Set together on a section that opens and closes. */
    expanded?: boolean;
    onPress?: () => void;
}

/** The count on an upcoming section, the total on a settled one. */
function SectionHeading({
    label,
    value,
    expanded,
    onPress,
}: SectionHeadingProps) {
    const theme = useTheme();

    const heading = [
        styles.sectionHeader,
        { borderTopColor: `${theme.text}29` },
    ];
    const content = (
        <>
            <View style={styles.sectionLabel}>
                <ThemedText type="label">{label}</ThemedText>
                {onPress && (
                    <SymbolView
                        name={{
                            ios: expanded ? 'chevron.down' : 'chevron.right',
                            web: expanded ? 'expand_less' : 'expand_more',
                        }}
                        tintColor={theme.textSecondary}
                        size={12}
                    />
                )}
            </View>
            <ThemedText themeColor="textSecondary" style={styles.sectionCount}>
                {value}
            </ThemedText>
        </>
    );

    if (!onPress) return <View style={heading}>{content}</View>;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            style={({ pressed }) => [heading, pressed && { opacity: 0.6 }]}>
            {content}
        </Pressable>
    );
}

function Payments() {
    const theme = useTheme();
    const {
        payments,
        loading,
        error,
        clearError,
        addPayment,
        editPayment,
        togglePaid,
        deletePayment,
    } = usePayments();
    const {
        subscriptions,
        error: subscriptionError,
        editSubscription,
    } = useSubscriptions();
    const { canManageContent, canToggle } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<PaymentItem | null>(null);
    const [showingEarlier, setShowingEarlier] = useState(false);
    /**
     * The last tick and how to reverse it. Ticking a renewal moves the
     * subscription's own date on, which nothing else can put back.
     */
    const [lastTick, setLastTick] = useState<{
        label: string;
        undo: () => void;
    } | null>(null);

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
    const [dueOn, setDueOn] = useState(getRelativeDateString(0));
    const [payerId, setPayerId] = useState<string | undefined>(undefined);

    const todayStr = getRelativeDateString(0);
    const minorUnits = parseAmount(amount);
    const complete = name.trim().length > 0 && minorUnits !== null;

    /** The stored payments, with one derived row per subscription beside them. */
    const outstanding = [
        ...payments.filter((one) => !one.paid).map(paymentRow),
        ...subscriptions.map(renewalRow),
    ].sort(byDue);

    /** The settled section is this month's, which is what its total counts. */
    const thisMonth = monthOf(todayStr);
    const settled = payments
        .filter((one) => one.paid && settledOn(one).startsWith(thisMonth))
        .map(paymentRow)
        .sort(byDue);
    const paid = paidInMonth(payments, thisMonth);

    /** Everything settled before this month, newest first, folded away. */
    const earlier = payments
        .filter((one) => one.paid && !settledOn(one).startsWith(thisMonth))
        .map(paymentRow)
        .sort(byDue)
        .reverse();

    const openAddModal = () => {
        setEditing(null);
        setName('');
        setAmount('');
        setCurrency(CURRENCIES[0]);
        setDueOn(getRelativeDateString(0));
        setPayerId(undefined);
        clearError();
        setModalVisible(true);
    };

    const openEditModal = (payment: PaymentItem) => {
        setEditing(payment);
        setName(payment.name);
        setAmount((payment.amount / 100).toFixed(2));
        setCurrency(payment.currency);
        setDueOn(payment.dueOn);
        setPayerId(payment.payerId ?? undefined);
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
            amount: minorUnits,
            currency,
            dueOn,
            payerId,
        };

        const saved = editing
            ? await editPayment(editing.id, input)
            : await addPayment(input);

        if (saved) setModalVisible(false);
    };

    /**
     * Ticking a renewal moves the subscription's own date on by a cycle. No
     * payment is written: the next renewal is the row that takes its place.
     */
    const tick = (row: DueRow) => {
        if (row.payment) {
            const { id } = row.payment;
            setLastTick({
                label: `${row.name} marked ${row.paid ? 'unpaid' : 'paid'}`,
                undo: () => togglePaid(id),
            });
            return togglePaid(id);
        }

        const subscription = row.subscription!;
        const { id, ...rest } = subscription;
        /** The date it moved off, so a mis-tap can put the renewal back. */
        const was = subscription.nextRenewal;
        setLastTick({
            label: `${row.name} renewed`,
            undo: () => editSubscription(id, { ...rest, nextRenewal: was }),
        });
        return editSubscription(id, {
            ...rest,
            nextRenewal: nextRenewalAfter(was, subscription.cycle),
        });
    };

    const renderRow = (row: DueRow) => (
        <PaymentRow
            key={row.key}
            row={row}
            theme={theme}
            tone={dueTone(row, todayStr)}
            canManage={canManageContent}
            /** A renewal is a write to the subscription, which a checker may not make. */
            canTick={
                row.subscription ? canManageContent : canToggle(row.payerId)
            }
            onTick={() => tick(row)}
            onEdit={() => row.payment && openEditModal(row.payment)}
            onDelete={() => row.payment && deletePayment(row.payment.id)}
        />
    );

    const listError = error ?? subscriptionError;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader
                    title="Payments"
                    subtitle={loading ? undefined : monthName(todayStr)}
                    figure={
                        paid
                            ? {
                                  value: formatAmount(
                                      paid.amount,
                                      paid.currency
                                  ),
                                  label: 'This month',
                              }
                            : undefined
                    }
                />

                {lastTick && (
                    <Pressable
                        onPress={() => {
                            lastTick.undo();
                            setLastTick(null);
                        }}
                        accessibilityLabel={`Undo: ${lastTick.label}`}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.undoRow,
                            { backgroundColor: `${theme.text}14` },
                            pressed && { opacity: 0.6 },
                        ]}>
                        <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            style={styles.undoLabel}
                            numberOfLines={1}>
                            {lastTick.label}
                        </ThemedText>
                        <ThemedText type="label">Undo</ThemedText>
                    </Pressable>
                )}

                {listError && !modalVisible && (
                    <ThemedText
                        type="small"
                        style={[
                            styles.listError,
                            { color: theme.destructive },
                        ]}>
                        {listError}
                    </ThemedText>
                )}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {outstanding.length === 0 &&
                    settled.length === 0 &&
                    earlier.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.emptyText}>
                            {loading ? '' : 'Nothing due.'}
                        </ThemedText>
                    ) : (
                        <>
                            {outstanding.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Upcoming"
                                        value={`${outstanding.length}`}
                                    />
                                    {outstanding.map(renderRow)}
                                </>
                            )}
                            {settled.length > 0 && (
                                <>
                                    <SectionHeading
                                        label={`Paid in ${monthName(todayStr)}`}
                                        value={
                                            paid
                                                ? formatAmount(
                                                      paid.amount,
                                                      paid.currency
                                                  )
                                                : `${settled.length}`
                                        }
                                    />
                                    {settled.map(renderRow)}
                                </>
                            )}
                            {earlier.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Earlier"
                                        value={`${earlier.length}`}
                                        expanded={showingEarlier}
                                        onPress={() =>
                                            setShowingEarlier((open) => !open)
                                        }
                                    />
                                    {showingEarlier && earlier.map(renderRow)}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                {canManageContent && (
                    <View style={styles.addButtonContainer}>
                        <Pressable
                            onPress={openAddModal}
                            accessibilityLabel="Add payment"
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
                                Add payment
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>

            <FormSheet
                visible={modalVisible}
                title={editing ? 'Edit payment' : 'Add a payment'}
                onClose={closeModal}
                actionLabel="Save"
                onAction={save}
                actionDisabled={!complete}
                error={error}>
                <FormField
                    label="Name"
                    placeholder="What is it for..."
                    value={name}
                    onChangeText={setName}
                />
                <AmountField
                    label="Amount"
                    placeholder="49.90"
                    value={amount}
                    onChangeText={setAmount}
                    currency={currency}
                    onChooseCurrency={setCurrency}
                />
                <DateRow label="Due" day={dueOn} onChange={setDueOn} />
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

export default function PaymentsScreen() {
    return (
        <SubscriptionsProvider>
            <PaymentsProvider>
                <Payments />
            </PaymentsProvider>
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
    undoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        marginHorizontal: Spacing.four,
        marginBottom: Spacing.two,
        borderRadius: 12,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
    },
    undoLabel: {
        flex: 1,
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
    sectionLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
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
    rowMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
    },
    rowTextColumn: {
        flex: 1,
    },
    rowWhen: {
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
});
