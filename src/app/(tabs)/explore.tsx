import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authClient } from '@/auth/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    paymentDeadlines,
    sharedLinks,
    subscriptions,
} from '@/constants/mock-data';
import {
    BottomTabInset,
    MaxContentWidth,
    type MemberColor,
    Spacing,
} from '@/constants/theme';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';

const MEMBER_COLORS: MemberColor[] = [
    'memberSage',
    'memberWalnut',
    'memberPlum',
    'memberSlate',
];

function formatDueDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IT', { month: 'short', day: 'numeric' });
}

export default function ExploreScreen() {
    const theme = useTheme();
    const { members, addMember, editMember, removeMember } = useMembers();
    const { data: session } = authClient.useSession();

    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [memberName, setMemberName] = useState('');
    const [memberColor, setMemberColor] = useState<MemberColor>(
        MEMBER_COLORS[0]
    );

    const openAddMember = () => {
        setEditingMemberId(null);
        setMemberName('');
        setMemberColor(MEMBER_COLORS[members.length % MEMBER_COLORS.length]);
        setMemberModalVisible(true);
    };

    const openEditMember = (id: string) => {
        const member = members.find((m) => m.id === id);
        if (!member) return;
        setEditingMemberId(id);
        setMemberName(member.name);
        setMemberColor(member.color);
        setMemberModalVisible(true);
    };

    const saveMember = () => {
        if (!memberName.trim()) return;
        if (editingMemberId) {
            editMember(editingMemberId, memberName, memberColor);
        } else {
            addMember(memberName, memberColor);
        }
        setMemberModalVisible(false);
    };

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
                    {/* ─── Family ─── */}
                    <View style={styles.sectionHeader}>
                        <SymbolView
                            name={{
                                ios: 'person.2.fill',
                                web: 'group',
                            }}
                            tintColor={theme.text}
                            size={18}
                        />
                        <ThemedText type="default" style={styles.sectionTitle}>
                            Family
                        </ThemedText>
                    </View>

                    {members.map((member) => (
                        <View
                            key={member.id}
                            style={[
                                styles.memberRow,
                                { backgroundColor: theme.backgroundElement },
                            ]}>
                            <Pressable
                                onPress={() => openEditMember(member.id)}
                                accessibilityLabel={`Edit ${member.name}`}
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.memberMain,
                                    pressed && { opacity: 0.6 },
                                ]}>
                                <View
                                    style={[
                                        styles.memberAvatar,
                                        {
                                            backgroundColor:
                                                theme[member.color],
                                        },
                                    ]}>
                                    <ThemedText
                                        themeColor="background"
                                        style={styles.memberInitials}>
                                        {member.initials}
                                    </ThemedText>
                                </View>
                                <ThemedText
                                    type="default"
                                    style={styles.memberName}>
                                    {member.name}
                                </ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={() => removeMember(member.id)}
                                accessibilityLabel={`Remove ${member.name}`}
                                accessibilityRole="button"
                                style={styles.memberDelete}>
                                <SymbolView
                                    name={{ ios: 'trash', web: 'delete' }}
                                    tintColor={theme.textSecondary}
                                    size={18}
                                />
                            </Pressable>
                        </View>
                    ))}

                    <Pressable
                        onPress={openAddMember}
                        accessibilityLabel="Add family member"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.row,
                            { backgroundColor: theme.backgroundElement },
                            pressed && {
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <SymbolView
                            name={{
                                ios: 'plus.circle.fill',
                                web: 'add_circle',
                            }}
                            tintColor={theme.textSecondary}
                            size={22}
                        />
                        <ThemedText themeColor="textSecondary" type="default">
                            Add family member
                        </ThemedText>
                    </Pressable>

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

                    {/* ─── Account ─── */}
                    <View
                        style={[
                            styles.sectionHeader,
                            { marginTop: Spacing.three },
                        ]}>
                        <SymbolView
                            name={{
                                ios: 'person.crop.circle',
                                web: 'account_circle',
                            }}
                            tintColor={theme.text}
                            size={18}
                        />
                        <ThemedText type="default" style={styles.sectionTitle}>
                            Account
                        </ThemedText>
                    </View>

                    <Pressable
                        onPress={() => authClient.signOut()}
                        accessibilityLabel="Sign out"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.row,
                            { backgroundColor: theme.backgroundElement },
                            pressed && {
                                backgroundColor: theme.backgroundSelected,
                            },
                        ]}>
                        <SymbolView
                            name={{
                                ios: 'rectangle.portrait.and.arrow.right',
                                web: 'logout',
                            }}
                            tintColor={theme.textSecondary}
                            size={22}
                        />
                        <View style={styles.rowContent}>
                            <ThemedText type="default">Sign out</ThemedText>
                            {session?.user.email && (
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    {session.user.email}
                                </ThemedText>
                            )}
                        </View>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>

            <Modal
                visible={memberModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMemberModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setMemberModalVisible(false)}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.modalContent,
                            { backgroundColor: theme.background },
                        ]}>
                        <ThemedText type="default" style={styles.modalLabel}>
                            {editingMemberId ? 'Edit member' : 'New member'}
                        </ThemedText>

                        <TextInput
                            style={[
                                styles.memberInput,
                                {
                                    backgroundColor: theme.backgroundElement,
                                    color: theme.text,
                                },
                            ]}
                            placeholder="Name"
                            placeholderTextColor={theme.textSecondary}
                            value={memberName}
                            onChangeText={setMemberName}
                            onSubmitEditing={saveMember}
                            returnKeyType="done"
                            accessibilityLabel="Member name"
                        />

                        <View style={styles.swatchRow}>
                            {MEMBER_COLORS.map((color) => (
                                <Pressable
                                    key={color}
                                    onPress={() => setMemberColor(color)}
                                    accessibilityLabel={`Colour ${color}`}
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        selected: color === memberColor,
                                    }}
                                    style={[
                                        styles.swatch,
                                        {
                                            backgroundColor: theme[color],
                                            borderColor:
                                                color === memberColor
                                                    ? theme.text
                                                    : 'transparent',
                                        },
                                    ]}
                                />
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable
                                onPress={() => setMemberModalVisible(false)}
                                accessibilityRole="button">
                                <ThemedText themeColor="textSecondary">
                                    Cancel
                                </ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={saveMember}
                                disabled={!memberName.trim()}
                                accessibilityRole="button">
                                <ThemedText
                                    themeColor={
                                        memberName.trim()
                                            ? 'link'
                                            : 'textSecondary'
                                    }>
                                    Save
                                </ThemedText>
                            </Pressable>
                        </View>
                    </View>
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
    memberAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberInitials: {
        fontSize: 15,
        fontWeight: '700',
    },
    memberName: {
        flex: 1,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
    },
    memberMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
    },
    memberDelete: {
        padding: Spacing.three,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
    },
    modalContent: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 20,
        padding: Spacing.four,
        gap: Spacing.three,
    },
    modalLabel: {
        fontWeight: '600',
    },
    memberInput: {
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        fontSize: 16,
    },
    swatchRow: {
        flexDirection: 'row',
        gap: Spacing.three,
    },
    swatch: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.three,
        marginTop: Spacing.one,
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
