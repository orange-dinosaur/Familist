import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFamily } from '@/hooks/use-family';
import { type Invitation, useInvitations } from '@/hooks/use-invitations';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';
import { copyToClipboard } from '@/utils/clipboard';
import { MEMBER_ROLES, type Member, type MemberRole } from '@/utils/member';

const ROLE_LABELS: Record<MemberRole, string> = {
    owner: 'Owner',
    editor: 'Editor',
    checker: 'Checker',
};

const ROLE_HINTS: Record<MemberRole, string> = {
    owner: 'Everything, plus managing the family',
    editor: 'Add, change and delete lists',
    checker: 'Tick off what is assigned to them',
};

/**
 * Each destructive action confirms in its own words. Deleting a placeholder
 * and taking an account member out of the family look like the same button and
 * are not the same act, so they never share this copy.
 */
type Confirm = 'revoke' | 'remove' | 'delete';

const CONFIRMATIONS: Record<
    Confirm,
    { title: string; body: string; action: string }
> = {
    revoke: {
        title: 'Revoke access?',
        body: 'They stay in the family and keep everything assigned to them, but can no longer sign in to it.',
        action: 'Revoke access',
    },
    remove: {
        title: 'Remove from the family?',
        body: 'They lose access and disappear from the family. Anything still assigned to them loses its assignee.',
        action: 'Remove',
    },
    delete: {
        title: 'Delete this member?',
        body: 'Nobody loses access - this member has never had an account. Anything assigned to them loses its assignee.',
        action: 'Delete',
    },
};

/**
 * Inviting is a mode of its own rather than another action on a member: it ends
 * in a code that has to reach a person, not in a changed row. `target` is the
 * placeholder being invited to sign in, or null for a brand new member.
 */
type Inviting = { target: Member | null };

export default function MembersScreen() {
    const theme = useTheme();
    const { member: membership } = useFamily();
    const {
        members,
        loading,
        setRole,
        revokeAccess,
        removeFromFamily,
        removeMember,
    } = useMembers();
    const { createInvitation } = useInvitations();

    const [openId, setOpenId] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<Confirm | null>(null);
    const [inviting, setInviting] = useState<Inviting | null>(null);
    const [inviteRole, setInviteRole] = useState<MemberRole>('editor');
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const canManage = membership?.role === 'owner';
    const open = members.find((m) => m.id === openId) ?? null;

    const openMember = (member: Member) => {
        if (!canManage) return;
        setOpenId(member.id);
        setConfirming(null);
        setError(null);
    };

    const close = () => {
        setOpenId(null);
        setConfirming(null);
        setInviting(null);
        setInvitation(null);
        setCopied(false);
        setError(null);
    };

    const startInviting = (target: Member | null) => {
        setOpenId(null);
        setConfirming(null);
        setError(null);
        setInvitation(null);
        setCopied(false);
        setInviteRole(target?.role ?? 'editor');
        setInviting({ target });
    };

    const createCode = async () => {
        if (!inviting || pending) return;
        setPending(true);
        setError(null);

        const result = await createInvitation(inviteRole, inviting.target?.id);

        setPending(false);
        if ('error' in result) {
            setError(result.error);
            return;
        }
        setInvitation(result);
    };

    const copyCode = () => {
        if (!invitation) return;
        copyToClipboard(invitation.code);
        setCopied(true);
    };

    const run = async (
        work: () => Promise<string | null>,
        thenClose: boolean
    ) => {
        if (pending) return;
        setPending(true);
        setError(null);

        const message = await work();

        setPending(false);
        if (message) {
            setError(message);
            setConfirming(null);
            return;
        }
        if (thenClose) close();
        else setConfirming(null);
    };

    const confirmed = () => {
        if (!open || !confirming) return;
        if (confirming === 'revoke') run(() => revokeAccess(open.id), false);
        if (confirming === 'remove') run(() => removeFromFamily(open.id), true);
        if (confirming === 'delete') run(() => removeMember(open.id), true);
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Pressable
                        onPress={() =>
                            router.canGoBack()
                                ? router.back()
                                : router.replace('/')
                        }
                        accessibilityLabel="Back"
                        accessibilityRole="button"
                        style={styles.back}>
                        <SymbolView
                            name={{ ios: 'chevron.left', web: 'chevron_left' }}
                            tintColor={theme.text}
                            size={22}
                        />
                    </Pressable>
                    <ThemedText type="subtitle">Family members</ThemedText>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {!loading && members.length === 0 && (
                        <ThemedText type="small" themeColor="textSecondary">
                            Nobody here yet.
                        </ThemedText>
                    )}

                    {members.map((member) => (
                        <Pressable
                            key={member.id}
                            onPress={() => openMember(member)}
                            disabled={!canManage}
                            accessibilityLabel={`Manage ${member.name}`}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.memberRow,
                                { backgroundColor: theme.backgroundElement },
                                pressed && { opacity: 0.6 },
                            ]}>
                            <View
                                style={[
                                    styles.avatar,
                                    { backgroundColor: theme[member.color] },
                                ]}>
                                <ThemedText
                                    themeColor="background"
                                    style={styles.initials}>
                                    {member.initials}
                                </ThemedText>
                            </View>
                            <View style={styles.memberText}>
                                <ThemedText type="default">
                                    {member.name}
                                    {member.id === membership?.id && ' (you)'}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    {member.role
                                        ? ROLE_LABELS[member.role]
                                        : 'No account'}
                                </ThemedText>
                            </View>
                        </Pressable>
                    ))}

                    {canManage && (
                        <Pressable
                            onPress={() => startInviting(null)}
                            accessibilityLabel="Invite someone to the family"
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.memberRow,
                                { backgroundColor: theme.backgroundElement },
                                pressed && { opacity: 0.6 },
                            ]}>
                            <SymbolView
                                name={{
                                    ios: 'person.badge.plus',
                                    web: 'person_add',
                                }}
                                tintColor={theme.textSecondary}
                                size={22}
                            />
                            <ThemedText themeColor="textSecondary">
                                Invite someone
                            </ThemedText>
                        </Pressable>
                    )}

                    {!canManage && members.length > 0 && (
                        <ThemedText type="small" themeColor="textSecondary">
                            Only an owner can change roles or remove people.
                        </ThemedText>
                    )}
                </ScrollView>
            </SafeAreaView>

            <Modal
                visible={open !== null || inviting !== null}
                transparent
                animationType="fade"
                onRequestClose={close}>
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={close}
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                    />
                    <View
                        style={[
                            styles.modalContent,
                            { backgroundColor: theme.background },
                        ]}>
                        {open && confirming === null && (
                            <>
                                <ThemedText type="subtitle">
                                    {open.name}
                                </ThemedText>

                                {open.role !== null && (
                                    <>
                                        <ThemedText
                                            type="smallBold"
                                            themeColor="textSecondary"
                                            style={styles.groupLabel}>
                                            Role
                                        </ThemedText>
                                        {MEMBER_ROLES.map((role) => (
                                            <Pressable
                                                key={role}
                                                onPress={() =>
                                                    run(
                                                        () =>
                                                            setRole(
                                                                open.id,
                                                                role
                                                            ),
                                                        false
                                                    )
                                                }
                                                disabled={pending}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    selected:
                                                        role === open.role,
                                                }}
                                                accessibilityLabel={`Make ${open.name} ${ROLE_LABELS[role]}`}
                                                style={({ pressed }) => [
                                                    styles.option,
                                                    role === open.role && {
                                                        backgroundColor:
                                                            theme.backgroundSelected,
                                                    },
                                                    pressed && { opacity: 0.6 },
                                                ]}>
                                                <View style={styles.optionText}>
                                                    <ThemedText type="default">
                                                        {ROLE_LABELS[role]}
                                                    </ThemedText>
                                                    <ThemedText
                                                        type="small"
                                                        themeColor="textSecondary">
                                                        {ROLE_HINTS[role]}
                                                    </ThemedText>
                                                </View>
                                                {role === open.role && (
                                                    <SymbolView
                                                        name={{
                                                            ios: 'checkmark',
                                                            web: 'check',
                                                        }}
                                                        tintColor={theme.text}
                                                        size={18}
                                                    />
                                                )}
                                            </Pressable>
                                        ))}
                                    </>
                                )}

                                {error && (
                                    <ThemedText
                                        type="small"
                                        style={{ color: theme.destructive }}>
                                        {error}
                                    </ThemedText>
                                )}

                                {open.role !== null &&
                                    open.id !== membership?.id && (
                                        <>
                                            <Pressable
                                                onPress={() =>
                                                    setConfirming('revoke')
                                                }
                                                accessibilityRole="button"
                                                style={styles.option}>
                                                <ThemedText type="default">
                                                    Revoke access
                                                </ThemedText>
                                            </Pressable>
                                            <Pressable
                                                onPress={() =>
                                                    setConfirming('remove')
                                                }
                                                accessibilityRole="button"
                                                style={styles.option}>
                                                <ThemedText
                                                    type="default"
                                                    style={{
                                                        color: theme.destructive,
                                                    }}>
                                                    Remove from the family
                                                </ThemedText>
                                            </Pressable>
                                        </>
                                    )}

                                {open.role === null && (
                                    <Pressable
                                        onPress={() => startInviting(open)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Invite ${open.name} to sign in`}
                                        style={styles.option}>
                                        <ThemedText type="default">
                                            Invite them to sign in
                                        </ThemedText>
                                    </Pressable>
                                )}

                                {open.role === null && (
                                    <Pressable
                                        onPress={() => setConfirming('delete')}
                                        accessibilityRole="button"
                                        style={styles.option}>
                                        <ThemedText
                                            type="default"
                                            style={{
                                                color: theme.destructive,
                                            }}>
                                            Delete this member
                                        </ThemedText>
                                    </Pressable>
                                )}

                                <View style={styles.modalActions}>
                                    <Pressable
                                        onPress={close}
                                        accessibilityRole="button">
                                        <ThemedText themeColor="textSecondary">
                                            Done
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {inviting && invitation === null && (
                            <>
                                <ThemedText type="subtitle">
                                    {inviting.target
                                        ? `Invite ${inviting.target.name}`
                                        : 'Invite someone'}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    {inviting.target
                                        ? 'They sign in as this member and keep everything already assigned to them.'
                                        : 'They join the family as a new member.'}
                                </ThemedText>

                                <ThemedText
                                    type="smallBold"
                                    themeColor="textSecondary"
                                    style={styles.groupLabel}>
                                    Role
                                </ThemedText>
                                {MEMBER_ROLES.map((role) => (
                                    <Pressable
                                        key={role}
                                        onPress={() => setInviteRole(role)}
                                        disabled={pending}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            selected: role === inviteRole,
                                        }}
                                        accessibilityLabel={`Invite as ${ROLE_LABELS[role]}`}
                                        style={({ pressed }) => [
                                            styles.option,
                                            role === inviteRole && {
                                                backgroundColor:
                                                    theme.backgroundSelected,
                                            },
                                            pressed && { opacity: 0.6 },
                                        ]}>
                                        <View style={styles.optionText}>
                                            <ThemedText type="default">
                                                {ROLE_LABELS[role]}
                                            </ThemedText>
                                            <ThemedText
                                                type="small"
                                                themeColor="textSecondary">
                                                {ROLE_HINTS[role]}
                                            </ThemedText>
                                        </View>
                                        {role === inviteRole && (
                                            <SymbolView
                                                name={{
                                                    ios: 'checkmark',
                                                    web: 'check',
                                                }}
                                                tintColor={theme.text}
                                                size={18}
                                            />
                                        )}
                                    </Pressable>
                                ))}

                                {error && (
                                    <ThemedText
                                        type="small"
                                        style={{ color: theme.destructive }}>
                                        {error}
                                    </ThemedText>
                                )}

                                <View style={styles.modalActions}>
                                    <Pressable
                                        onPress={close}
                                        disabled={pending}
                                        accessibilityRole="button">
                                        <ThemedText themeColor="textSecondary">
                                            Cancel
                                        </ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={createCode}
                                        disabled={pending}
                                        accessibilityRole="button">
                                        <ThemedText themeColor="link">
                                            Create a code
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {inviting && invitation !== null && (
                            <>
                                <ThemedText type="subtitle">
                                    Their invite code
                                </ThemedText>
                                <ThemedText
                                    selectable
                                    style={[
                                        styles.code,
                                        { color: theme.text },
                                    ]}>
                                    {invitation.code}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    Anyone holding this code can join your
                                    family as {ROLE_LABELS[inviteRole]}. It
                                    stops working on{' '}
                                    {new Date(
                                        invitation.expiresAt
                                    ).toLocaleDateString()}
                                    .
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    Nothing is emailed - pass it on yourself.
                                </ThemedText>

                                <View style={styles.modalActions}>
                                    <Pressable
                                        onPress={copyCode}
                                        accessibilityRole="button"
                                        accessibilityLabel="Copy the invite code">
                                        <ThemedText themeColor="link">
                                            {copied ? 'Copied' : 'Copy code'}
                                        </ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={close}
                                        accessibilityRole="button">
                                        <ThemedText themeColor="textSecondary">
                                            Done
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {open && confirming !== null && (
                            <>
                                <ThemedText type="subtitle">
                                    {CONFIRMATIONS[confirming].title}
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary">
                                    {CONFIRMATIONS[confirming].body}
                                </ThemedText>

                                <View style={styles.modalActions}>
                                    <Pressable
                                        onPress={() => setConfirming(null)}
                                        disabled={pending}
                                        accessibilityRole="button">
                                        <ThemedText themeColor="textSecondary">
                                            Cancel
                                        </ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={confirmed}
                                        disabled={pending}
                                        accessibilityRole="button">
                                        <ThemedText
                                            style={{
                                                color: theme.destructive,
                                            }}>
                                            {CONFIRMATIONS[confirming].action}
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </>
                        )}
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
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingTop: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.two,
    },
    back: {
        padding: Spacing.one,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.five,
        gap: Spacing.two,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 12,
        padding: Spacing.three,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        fontSize: 14,
        fontWeight: '600',
    },
    memberText: {
        flex: 1,
        gap: Spacing.half,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: Spacing.four,
    },
    modalContent: {
        width: '100%',
        maxWidth: MaxContentWidth,
        borderRadius: 16,
        padding: Spacing.four,
        gap: Spacing.two,
    },
    groupLabel: {
        paddingTop: Spacing.two,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 12,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
    },
    optionText: {
        flex: 1,
        gap: Spacing.half,
    },
    code: {
        fontSize: 30,
        lineHeight: 38,
        fontWeight: '600',
        letterSpacing: 3,
        textAlign: 'center',
        paddingVertical: Spacing.two,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.four,
        paddingTop: Spacing.two,
    },
});
