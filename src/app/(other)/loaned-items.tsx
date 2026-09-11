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

import { DatePickerModal } from '@/components/date-picker-modal';
import {
    FormField,
    FormSheet,
    MemberPicker,
    OptionTabs,
} from '@/components/form-sheet';
import { MemberAvatar } from '@/components/member-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    daysUntil,
    formatCompactDateString,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/dates';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { type LoanItem } from '@/constants/types';
import { LoansProvider, useLoans } from '@/hooks/use-loans';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';

import {
    byDay,
    counterpartyLabel,
    LOAN_DIRECTIONS,
    directionLabel,
} from '@/utils/loan';

interface LoanRowProps {
    loan: LoanItem;
    canManage: boolean;
    canTick: boolean;
    onTick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const LoanRow = React.memo(
    ({
        loan,
        canManage,
        canTick,
        onTick,
        onEdit,
        onDelete,
        theme,
    }: LoanRowProps) => {
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

        const member = members.find((m) => m.id === loan.memberId);

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
                    <Pressable
                        onPress={onTick}
                        disabled={!canTick}
                        accessibilityLabel={`Mark ${loan.item} returned`}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.rowMain,
                            pressed && { opacity: 0.6 },
                        ]}>
                        <SymbolView
                            name={{
                                ios: loan.returned
                                    ? 'checkmark.circle.fill'
                                    : 'circle',
                                web: loan.returned
                                    ? 'check_circle'
                                    : 'radio_button_unchecked',
                            }}
                            tintColor={
                                loan.returned
                                    ? theme.memberSage
                                    : canTick
                                      ? theme.textSecondary
                                      : theme.textMuted
                            }
                            size={20}
                        />

                        <View style={styles.rowTextColumn}>
                            <ThemedText
                                type="small"
                                themeColor={
                                    loan.returned ? 'textMuted' : 'text'
                                }
                                style={loan.returned && styles.strikethrough}>
                                {loan.item}
                            </ThemedText>
                            <ThemedText
                                type="labelSmall"
                                themeColor="textMuted"
                                style={styles.rowWho}>
                                {counterpartyLabel(loan.direction)}{' '}
                                {loan.counterparty} ·{' '}
                                {loan.returned && loan.returnedOn
                                    ? `back ${formatCompactDateString(loan.returnedOn)}`
                                    : `since ${formatCompactDateString(loan.day)}`}
                            </ThemedText>
                        </View>
                    </Pressable>

                    {!loan.returned && (
                        <View style={styles.rowAway}>
                            <ThemedText type="figure">
                                {-daysUntil(loan.day)}
                            </ThemedText>
                            <ThemedText
                                type="labelSmall"
                                themeColor="textMuted">
                                days
                            </ThemedText>
                        </View>
                    )}

                    {member && <MemberAvatar member={member} size={24} />}
                </View>
            </Swipeable>
        );
    }
);

LoanRow.displayName = 'LoanRow';

function Loans() {
    const theme = useTheme();
    const {
        loans,
        loading,
        error,
        clearError,
        addLoan,
        editLoan,
        toggleReturned,
        deleteLoan,
    } = useLoans();
    const { canManageContent, canToggle } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<LoanItem | null>(null);
    const [showingReturned, setShowingReturned] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    const [item, setItem] = useState('');
    const [direction, setDirection] = useState<LoanItem['direction']>('lent');
    const [counterparty, setCounterparty] = useState('');
    const [memberId, setMemberId] = useState<string | undefined>(undefined);
    const [day, setDay] = useState(getRelativeDateString(0));

    const complete = item.trim().length > 0 && counterparty.trim().length > 0;

    const out = loans.filter((one) => !one.returned);
    const lent = out.filter((one) => one.direction === 'lent').sort(byDay);
    const borrowed = out
        .filter((one) => one.direction === 'borrowed')
        .sort(byDay);
    const back = loans.filter((one) => one.returned).sort(byDay);

    const openAddModal = () => {
        setEditing(null);
        setItem('');
        setDirection('lent');
        setCounterparty('');
        setMemberId(undefined);
        setDay(getRelativeDateString(0));
        clearError();
        setModalVisible(true);
    };

    const openEditModal = (loan: LoanItem) => {
        setEditing(loan);
        setItem(loan.item);
        setDirection(loan.direction);
        setCounterparty(loan.counterparty);
        setMemberId(loan.memberId ?? undefined);
        setDay(loan.day);
        clearError();
        setModalVisible(true);
    };

    const closeModal = () => {
        clearError();
        setDatePickerVisible(false);
        setModalVisible(false);
    };

    const save = async () => {
        if (!complete) return;

        const input = {
            item: item.trim(),
            direction,
            counterparty: counterparty.trim(),
            memberId,
            day,
        };

        const saved = editing
            ? await editLoan(editing.id, input)
            : await addLoan(input);

        if (saved) setModalVisible(false);
    };

    const renderRow = (loan: LoanItem) => (
        <LoanRow
            key={loan.id}
            loan={loan}
            theme={theme}
            canManage={canManageContent}
            canTick={canToggle(loan.memberId)}
            onTick={() => toggleReturned(loan.id)}
            onEdit={() => openEditModal(loan)}
            onDelete={() => deleteLoan(loan.id)}
        />
    );

    const renderGroup = (which: LoanItem['direction'], group: LoanItem[]) =>
        group.length > 0 && (
            <React.Fragment key={which}>
                <View
                    style={[
                        styles.sectionHeader,
                        { borderTopColor: `${theme.text}29` },
                    ]}>
                    <ThemedText type="label">
                        {directionLabel(which)}
                    </ThemedText>
                    <ThemedText
                        themeColor="textSecondary"
                        style={styles.sectionCount}>
                        {group.length}
                    </ThemedText>
                </View>
                {group.map(renderRow)}
            </React.Fragment>
        );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader
                    title="Loaned Items"
                    subtitle={
                        loading || back.length === 0
                            ? undefined
                            : `${back.length} already back`
                    }
                    figure={
                        loading
                            ? undefined
                            : { value: `${out.length}`, label: 'Out' }
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
                    {out.length === 0 ? (
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.emptyText}>
                            {loading ? '' : 'Nothing is out.'}
                        </ThemedText>
                    ) : (
                        <>
                            {renderGroup('lent', lent)}
                            {renderGroup('borrowed', borrowed)}
                        </>
                    )}

                    {/* Back again, out of the way but not out of reach. */}
                    {back.length > 0 && (
                        <>
                            <Pressable
                                onPress={() =>
                                    setShowingReturned((shown) => !shown)
                                }
                                accessibilityRole="button"
                                accessibilityState={{
                                    expanded: showingReturned,
                                }}
                                style={({ pressed }) => [
                                    styles.showReturnedRow,
                                    pressed && { opacity: 0.6 },
                                ]}>
                                <SymbolView
                                    name={{
                                        ios: showingReturned
                                            ? 'chevron.down'
                                            : 'chevron.right',
                                        web: showingReturned
                                            ? 'expand_less'
                                            : 'expand_more',
                                    }}
                                    tintColor={theme.textSecondary}
                                    size={12}
                                />
                                <ThemedText
                                    themeColor="textSecondary"
                                    type="labelSmall">
                                    {showingReturned ? 'Hide' : 'Show'}{' '}
                                    {back.length} returned
                                </ThemedText>
                            </Pressable>

                            {showingReturned && back.map(renderRow)}
                        </>
                    )}
                </ScrollView>

                {canManageContent && (
                    <View style={styles.addButtonContainer}>
                        <Pressable
                            onPress={openAddModal}
                            accessibilityLabel="Add loan"
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
                                Add loan
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>

            <FormSheet
                visible={modalVisible}
                title={editing ? 'Edit loan' : 'Add a loan'}
                onClose={closeModal}
                actionLabel="Save"
                onAction={save}
                actionDisabled={!complete}
                error={error}>
                <FormField
                    label="Item"
                    placeholder="What it is..."
                    value={item}
                    onChangeText={setItem}
                />

                <OptionTabs
                    label="Direction"
                    options={LOAN_DIRECTIONS}
                    chosen={direction}
                    onChoose={setDirection}
                />

                <FormField
                    label={
                        direction === 'lent' ? 'Who has it' : 'Who it is from'
                    }
                    placeholder="A name..."
                    value={counterparty}
                    onChangeText={setCounterparty}
                />

                <ThemedText
                    type="label"
                    themeColor="textSecondary"
                    style={styles.modalLabel}>
                    {direction === 'lent'
                        ? 'Day it went out'
                        : 'Day it came in'}
                </ThemedText>
                <Pressable
                    onPress={() => setDatePickerVisible(true)}
                    accessibilityLabel="Pick the day"
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
                        {formatShortDateString(day)}
                    </ThemedText>
                </Pressable>

                <MemberPicker
                    label="Whose loan it is"
                    chosenId={memberId}
                    onChoose={(id) =>
                        setMemberId(memberId === id ? undefined : id)
                    }
                />

                <DatePickerModal
                    visible={datePickerVisible}
                    value={day}
                    onSelect={(picked) => {
                        setDay(picked);
                        setDatePickerVisible(false);
                    }}
                    onClose={() => setDatePickerVisible(false)}
                />
            </FormSheet>
        </ThemedView>
    );
}

export default function LoanedItemsScreen() {
    return (
        <LoansProvider>
            <Loans />
        </LoansProvider>
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

    // The two groups
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two,
        borderTopWidth: 1,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.one,
    },
    sectionCount: {
        fontSize: 11,
        lineHeight: 16,
    },
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
        minWidth: 0,
    },
    rowWho: {
        marginTop: Spacing.one,
    },
    rowAway: {
        alignItems: 'flex-end',
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    showReturnedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.four,
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
    modalLabel: {
        marginTop: Spacing.three,
        marginBottom: Spacing.two,
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
});
