/**
 * The family's members, as faces of the sheet the family bar opens rather than
 * a screen of its own. Managing who is in the family is a thing done to the
 * family, so it belongs beside renaming and leaving it.
 *
 * Every face is a plain view: the sheet is already inside a modal, and a
 * second one on top of it would be a different kind of thing again.
 */

import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MemberAvatar } from '@/components/member-avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
 * Inviting is a face of its own rather than another action on a member: it ends
 * in a code that has to reach a person, not in a changed row. `target` is the
 * placeholder being invited to sign in, or null for a brand new member.
 */
type Inviting = { target: Member | null };

export function FamilyMembers({ onBack }: { onBack: () => void }) {
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

    /** Back to the list, which is this sheet's own way of closing a face. */
    const toList = () => {
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
        thenBack: boolean
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
        if (thenBack) toList();
        else setConfirming(null);
    };

    const confirmed = () => {
        if (!open || !confirming) return;
        if (confirming === 'revoke') run(() => revokeAccess(open.id), false);
        if (confirming === 'remove') run(() => removeFromFamily(open.id), true);
        if (confirming === 'delete') run(() => removeMember(open.id), true);
    };

    const roleRow = (
        role: MemberRole,
        selected: boolean,
        onPress: () => void,
        label: string
    ) => (
        <Pressable
            key={role}
            onPress={onPress}
            disabled={pending}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.option,
                selected && { backgroundColor: theme.backgroundSelected },
                pressed && { opacity: 0.6 },
            ]}>
            <View style={styles.optionText}>
                <ThemedText type="default">{ROLE_LABELS[role]}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    {ROLE_HINTS[role]}
                </ThemedText>
            </View>
            {selected && (
                <SymbolView
                    name={{ ios: 'checkmark', web: 'check' }}
                    tintColor={theme.text}
                    size={18}
                />
            )}
        </Pressable>
    );

    if (open && confirming !== null) {
        return (
            <>
                <ThemedText type="subtitle">
                    {CONFIRMATIONS[confirming].title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    {CONFIRMATIONS[confirming].body}
                </ThemedText>

                <View style={styles.actions}>
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
                        <ThemedText style={{ color: theme.destructive }}>
                            {CONFIRMATIONS[confirming].action}
                        </ThemedText>
                    </Pressable>
                </View>
            </>
        );
    }

    if (inviting && invitation !== null) {
        return (
            <>
                <ThemedText type="subtitle">Their invite code</ThemedText>
                <ThemedText
                    selectable
                    style={[styles.code, { color: theme.text }]}>
                    {invitation.code}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    Anyone holding this code can join your family as{' '}
                    {ROLE_LABELS[inviteRole]}. It stops working on{' '}
                    {new Date(invitation.expiresAt).toLocaleDateString()}.
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    Nothing is emailed - pass it on yourself.
                </ThemedText>

                <View style={styles.actions}>
                    <Pressable
                        onPress={copyCode}
                        accessibilityRole="button"
                        accessibilityLabel="Copy the invite code">
                        <ThemedText themeColor="link">
                            {copied ? 'Copied' : 'Copy code'}
                        </ThemedText>
                    </Pressable>
                    <Pressable onPress={toList} accessibilityRole="button">
                        <ThemedText themeColor="textSecondary">Done</ThemedText>
                    </Pressable>
                </View>
            </>
        );
    }

    if (inviting) {
        return (
            <>
                <ThemedText type="subtitle">
                    {inviting.target
                        ? `Invite ${inviting.target.name}`
                        : 'Invite someone'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
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
                {MEMBER_ROLES.map((role) =>
                    roleRow(
                        role,
                        role === inviteRole,
                        () => setInviteRole(role),
                        `Invite as ${ROLE_LABELS[role]}`
                    )
                )}

                {error && (
                    <ThemedText
                        type="small"
                        style={{ color: theme.destructive }}>
                        {error}
                    </ThemedText>
                )}

                <View style={styles.actions}>
                    <Pressable
                        onPress={toList}
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
                        <ThemedText themeColor="link">Create a code</ThemedText>
                    </Pressable>
                </View>
            </>
        );
    }

    if (open) {
        return (
            <>
                <ThemedText type="subtitle">{open.name}</ThemedText>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {open.role !== null && (
                        <>
                            <ThemedText
                                type="smallBold"
                                themeColor="textSecondary"
                                style={styles.groupLabel}>
                                Role
                            </ThemedText>
                            {MEMBER_ROLES.map((role) =>
                                roleRow(
                                    role,
                                    role === open.role,
                                    () =>
                                        run(
                                            () => setRole(open.id, role),
                                            false
                                        ),
                                    `Make ${open.name} ${ROLE_LABELS[role]}`
                                )
                            )}
                        </>
                    )}

                    {error && (
                        <ThemedText
                            type="small"
                            style={{ color: theme.destructive }}>
                            {error}
                        </ThemedText>
                    )}

                    {open.role !== null && open.id !== membership?.id && (
                        <>
                            <Pressable
                                onPress={() => setConfirming('revoke')}
                                accessibilityRole="button"
                                style={styles.option}>
                                <ThemedText type="default">
                                    Revoke access
                                </ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={() => setConfirming('remove')}
                                accessibilityRole="button"
                                style={styles.option}>
                                <ThemedText
                                    type="default"
                                    style={{ color: theme.destructive }}>
                                    Remove from the family
                                </ThemedText>
                            </Pressable>
                        </>
                    )}

                    {open.role === null && (
                        <>
                            <Pressable
                                onPress={() => startInviting(open)}
                                accessibilityRole="button"
                                accessibilityLabel={`Invite ${open.name} to sign in`}
                                style={styles.option}>
                                <ThemedText type="default">
                                    Invite them to sign in
                                </ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={() => setConfirming('delete')}
                                accessibilityRole="button"
                                style={styles.option}>
                                <ThemedText
                                    type="default"
                                    style={{ color: theme.destructive }}>
                                    Delete this member
                                </ThemedText>
                            </Pressable>
                        </>
                    )}
                </ScrollView>

                <View style={styles.actions}>
                    <Pressable onPress={toList} accessibilityRole="button">
                        <ThemedText themeColor="textSecondary">Done</ThemedText>
                    </Pressable>
                </View>
            </>
        );
    }

    return (
        <>
            <ThemedText type="subtitle">Family members</ThemedText>

            <ScrollView
                style={styles.scroll}
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
                        <MemberAvatar member={member} size={36} />
                        <View style={styles.memberText}>
                            <ThemedText type="default">
                                {member.name}
                                {member.id === membership?.id && ' (you)'}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
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

            <View style={styles.actions}>
                <Pressable onPress={onBack} accessibilityRole="button">
                    <ThemedText themeColor="textSecondary">Back</ThemedText>
                </Pressable>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    /** The sheet is centred, so the list gives way rather than pushing it off. */
    scroll: {
        flexGrow: 0,
        maxHeight: 360,
    },
    scrollContent: {
        gap: Spacing.two,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 12,
        padding: Spacing.three,
    },
    memberText: {
        flex: 1,
        gap: Spacing.half,
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
        letterSpacing: 2,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.four,
        paddingTop: Spacing.two,
    },
});
