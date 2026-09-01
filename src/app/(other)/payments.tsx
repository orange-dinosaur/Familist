import { SymbolView } from 'expo-symbols';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatePickerModal } from '@/components/date-picker-modal';
import { MemberAvatar } from '@/components/member-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CURRENCIES, type Currency } from '@/constants/currencies';
import {
    formatDaysUntil,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/dates';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
    paymentRow,
    renewalRow,
} from '@/utils/payment';

interface DueRowProps {
    row: DueRow;
    overdue: boolean;
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
        overdue,
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
                        { backgroundColor: theme.backgroundElement },
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
                            size={22}
                        />

                        <View style={styles.rowTextColumn}>
                            <View style={styles.nameLine}>
                                {row.emoji ? (
                                    <ThemedText style={styles.emoji}>
                                        {row.emoji}
                                    </ThemedText>
                                ) : null}
                                <ThemedText
                                    themeColor={
                                        row.paid ? 'textSecondary' : 'text'
                                    }
                                    style={row.paid && styles.strikethrough}>
                                    {row.name}
                                </ThemedText>
                            </View>
                            <ThemedText
                                type="small"
                                style={{
                                    color: overdue
                                        ? theme.destructive
                                        : theme.textSecondary,
                                }}>
                                {formatAmount(row.amount, row.currency)} ·{' '}
                                {row.paid
                                    ? formatShortDateString(row.dueOn)
                                    : formatDaysUntil(row.dueOn)}
                            </ThemedText>
                        </View>
                    </Pressable>

                    {row.subscription && (
                        <SymbolView
                            name={{
                                ios: 'arrow.triangle.2.circlepath',
                                web: 'autorenew',
                            }}
                            tintColor={theme.textSecondary}
                            size={16}
                        />
                    )}

                    {payer && <MemberAvatar member={payer} size={24} />}
                </View>
            </Swipeable>
        );
    }
);

PaymentRow.displayName = 'PaymentRow';

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
    const { members } = useMembers();
    const { canManageContent, canToggle } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<PaymentItem | null>(null);
    const [showingPaid, setShowingPaid] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);

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
    const settled = payments
        .filter((one) => one.paid)
        .map(paymentRow)
        .sort(byDue);

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
        setDatePickerVisible(false);
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
        if (row.payment) return togglePaid(row.payment.id);

        const subscription = row.subscription!;
        const { id, ...rest } = subscription;
        return editSubscription(id, {
            ...rest,
            nextRenewal: nextRenewalAfter(
                subscription.nextRenewal,
                subscription.cycle
            ),
        });
    };

    const renderRow = (row: DueRow) => (
        <PaymentRow
            key={row.key}
            row={row}
            theme={theme}
            overdue={!row.paid && row.dueOn < todayStr}
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
                <ScreenHeader title="Payments" />

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
                    {outstanding.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.emptyText}>
                            {loading ? '' : 'Nothing due.'}
                        </ThemedText>
                    ) : (
                        <View style={styles.list}>
                            {outstanding.map(renderRow)}
                        </View>
                    )}

                    {/* Settled, out of the way but not out of reach. */}
                    {settled.length > 0 && (
                        <>
                            <Pressable
                                onPress={() =>
                                    setShowingPaid((shown) => !shown)
                                }
                                accessibilityRole="button"
                                accessibilityState={{ expanded: showingPaid }}
                                style={({ pressed }) => [
                                    styles.showPaidRow,
                                    pressed && { opacity: 0.6 },
                                ]}>
                                <SymbolView
                                    name={{
                                        ios: showingPaid
                                            ? 'chevron.down'
                                            : 'chevron.right',
                                        web: showingPaid
                                            ? 'expand_less'
                                            : 'expand_more',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={14}
                                />
                                <ThemedText
                                    themeColor="textSecondary"
                                    type="small">
                                    {showingPaid ? 'Hide' : 'Show'}{' '}
                                    {settled.length} paid
                                </ThemedText>
                            </Pressable>

                            {showingPaid && (
                                <View style={styles.list}>
                                    {settled.map(renderRow)}
                                </View>
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
                            <SymbolView
                                name={{ ios: 'plus', web: 'add' }}
                                tintColor={theme.background}
                                size={20}
                            />
                            <ThemedText
                                style={[
                                    styles.addButtonText,
                                    { color: theme.background },
                                ]}>
                                Add Payment
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>

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
                        <View style={styles.modalHeader}>
                            <ThemedText type="subtitle">
                                {editing ? 'Edit Payment' : 'Add Payment'}
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
                            <ThemedText style={styles.modalLabel}>
                                Name
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor:
                                            theme.backgroundElement,
                                        color: theme.text,
                                    },
                                ]}
                                placeholder="What is it for..."
                                placeholderTextColor={theme.textSecondary}
                                value={name}
                                onChangeText={setName}
                                accessibilityLabel="Name"
                            />

                            <ThemedText style={styles.modalLabel}>
                                Amount
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor:
                                            theme.backgroundElement,
                                        color: theme.text,
                                    },
                                ]}
                                placeholder="49.90"
                                placeholderTextColor={theme.textSecondary}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                accessibilityLabel="Amount"
                            />

                            <ThemedText style={styles.modalLabel}>
                                Currency
                            </ThemedText>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pillRow}>
                                {CURRENCIES.map((code) => {
                                    const isSelected = currency === code;
                                    return (
                                        <Pressable
                                            key={code}
                                            onPress={() => setCurrency(code)}
                                            accessibilityRole="button"
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                            style={[
                                                styles.pill,
                                                {
                                                    backgroundColor: isSelected
                                                        ? theme.text
                                                        : theme.backgroundElement,
                                                },
                                            ]}>
                                            <ThemedText
                                                type="small"
                                                style={{
                                                    color: isSelected
                                                        ? theme.background
                                                        : theme.text,
                                                }}>
                                                {code}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

                            <ThemedText style={styles.modalLabel}>
                                Due
                            </ThemedText>
                            <Pressable
                                onPress={() => setDatePickerVisible(true)}
                                accessibilityLabel="Pick the due date"
                                accessibilityRole="button"
                                style={[
                                    styles.pill,
                                    styles.datePill,
                                    { backgroundColor: theme.text },
                                ]}>
                                <SymbolView
                                    name={{
                                        ios: 'calendar',
                                        web: 'calendar_month',
                                    }}
                                    tintColor={theme.background}
                                    size={18}
                                />
                                <ThemedText style={{ color: theme.background }}>
                                    {formatShortDateString(dueOn)}
                                </ThemedText>
                            </Pressable>

                            <ThemedText style={styles.modalLabel}>
                                Who pays
                            </ThemedText>
                            <View style={styles.payerList}>
                                {members.map((member) => {
                                    const isSelected = payerId === member.id;
                                    return (
                                        <Pressable
                                            key={member.id}
                                            onPress={() =>
                                                setPayerId(
                                                    isSelected
                                                        ? undefined
                                                        : member.id
                                                )
                                            }
                                            accessibilityLabel={`Paid by ${member.name}`}
                                            accessibilityRole="button"
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                            style={[
                                                styles.payerRow,
                                                {
                                                    backgroundColor:
                                                        theme.backgroundElement,
                                                    borderColor: isSelected
                                                        ? theme.text
                                                        : 'transparent',
                                                },
                                            ]}>
                                            <MemberAvatar
                                                member={member}
                                                size={32}
                                            />
                                            <ThemedText
                                                style={styles.payerName}>
                                                {member.name}
                                            </ThemedText>
                                            {isSelected && (
                                                <SymbolView
                                                    name={{
                                                        ios: 'checkmark.circle.fill',
                                                        web: 'check_circle',
                                                    }}
                                                    tintColor={theme.text}
                                                    size={22}
                                                />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            {error && (
                                <ThemedText
                                    type="small"
                                    style={{ color: theme.destructive }}>
                                    {error}
                                </ThemedText>
                            )}
                            <Pressable
                                onPress={save}
                                disabled={!complete}
                                accessibilityLabel="Save payment"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.saveButton,
                                    {
                                        backgroundColor: complete
                                            ? theme.text
                                            : theme.backgroundElement,
                                    },
                                    pressed && { opacity: 0.8 },
                                ]}>
                                <ThemedText
                                    style={[
                                        styles.saveButtonText,
                                        {
                                            color: complete
                                                ? theme.background
                                                : theme.textSecondary,
                                        },
                                    ]}>
                                    Save
                                </ThemedText>
                            </Pressable>
                        </View>

                        <DatePickerModal
                            visible={datePickerVisible}
                            value={dueOn}
                            onSelect={(day) => {
                                setDueOn(day);
                                setDatePickerVisible(false);
                            }}
                            onClose={() => setDatePickerVisible(false)}
                        />
                    </SafeAreaView>
                </View>
            </Modal>
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
    emptyText: {
        fontStyle: 'italic',
        paddingVertical: Spacing.two,
    },

    // The list
    list: {
        gap: Spacing.one,
    },
    swipeableContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.three,
    },
    rowMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
    },
    rowTextColumn: {
        flex: 1,
        gap: Spacing.half,
    },
    nameLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
    },
    emoji: {
        fontSize: 18,
        lineHeight: 22,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    showPaidRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.three,
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
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },

    // Add button
    addButtonContainer: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        borderRadius: 14,
        paddingVertical: Spacing.three,
    },
    addButtonText: {
        fontWeight: '600',
    },

    // The add and edit form
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
        paddingVertical: Spacing.three,
    },
    modalScroll: {
        flex: 1,
    },
    modalScrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
    },
    modalLabel: {
        fontWeight: '600',
        marginTop: Spacing.three,
        marginBottom: Spacing.two,
    },
    textInput: {
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
        fontSize: 16,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    pill: {
        borderRadius: 16,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    datePill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.two,
    },
    payerList: {
        gap: Spacing.two,
    },
    payerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 12,
        borderWidth: 2,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    payerName: {
        flex: 1,
    },
    modalFooter: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        gap: Spacing.two,
    },
    saveButton: {
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: Spacing.three,
    },
    saveButtonText: {
        fontWeight: '600',
    },
});
