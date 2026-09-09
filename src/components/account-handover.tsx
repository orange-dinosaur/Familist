/**
 * The way out of a deletion that was refused: the families the person is the
 * last owner of, and who in each of them could take it.
 *
 * Shown in place of the confirmation once the route has said no, so the answer
 * to "make someone else an owner" is where the refusal is rather than
 * somewhere the reader has to go and find.
 */

import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MemberAvatar } from '@/components/member-avatar';
import { ThemedText } from '@/components/themed-text';
import { apiFetch } from '@/auth/client';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Member } from '@/utils/member';

export interface OwnedFamily {
    id: string;
    name: string;
}

function SectionLabel({ label, count }: { label: string; count?: number }) {
    const theme = useTheme();

    return (
        <View
            style={[
                styles.sectionHeader,
                { borderTopColor: `${theme.text}29` },
            ]}>
            <ThemedText type="label">{label}</ThemedText>
            {count !== undefined && (
                <ThemedText
                    themeColor="textSecondary"
                    style={styles.sectionCount}>
                    {count}
                </ThemedText>
            )}
        </View>
    );
}

interface AccountHandoverProps {
    families: OwnedFamily[];
    /** Called with the family that has just been handed over. */
    onHandedOver: (family: OwnedFamily) => void;
    onCancel: () => void;
}

export function AccountHandover({
    families,
    onHandedOver,
    onCancel,
}: AccountHandoverProps) {
    const theme = useTheme();

    const [open, setOpen] = useState<OwnedFamily | null>(null);
    const [candidates, setCandidates] = useState<Member[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openFamily = async (family: OwnedFamily) => {
        setBusy(true);
        setError(null);
        setCandidates([]);

        const res = await apiFetch(
            `/api/account/handover?familyId=${encodeURIComponent(family.id)}`
        );
        const body = await res.json().catch(() => null);
        setBusy(false);

        if (!res.ok) {
            setError(body?.error ?? 'Could not read that family.');
            return;
        }

        setOpen(family);
        setCandidates(body?.members ?? []);
    };

    const handOver = async (member: Member) => {
        if (!open || busy) return;
        setBusy(true);
        setError(null);

        const res = await apiFetch('/api/account/handover', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ familyId: open.id, memberId: member.id }),
        });
        const body = await res.json().catch(() => null);
        setBusy(false);

        if (!res.ok) {
            setError(body?.error ?? 'Could not hand it over.');
            return;
        }

        const handed = open;
        setOpen(null);
        setCandidates([]);
        onHandedOver(handed);
    };

    if (open) {
        return (
            <>
                <View style={styles.identity}>
                    <ThemedText type="figureLarge">
                        Who takes {open.name}?
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        They become an owner and can manage the family. You stay
                        an owner until your account goes.
                    </ThemedText>
                </View>

                <SectionLabel label="New owner" count={candidates.length} />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {candidates.map((member) => (
                        <Pressable
                            key={member.id}
                            onPress={() => handOver(member)}
                            disabled={busy}
                            accessibilityLabel={`Make ${member.name} an owner`}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.row,
                                { borderBottomColor: `${theme.text}17` },
                                pressed && { opacity: 0.6 },
                            ]}>
                            <MemberAvatar member={member} size={34} />
                            <ThemedText type="default" style={styles.rowLabel}>
                                {member.name}
                            </ThemedText>
                        </Pressable>
                    ))}
                </ScrollView>

                {error && (
                    <ThemedText
                        type="small"
                        style={{ color: theme.destructive }}>
                        {error}
                    </ThemedText>
                )}

                <View style={styles.actions}>
                    <Pressable
                        onPress={() => setOpen(null)}
                        disabled={busy}
                        accessibilityRole="button">
                        <ThemedText themeColor="textSecondary">Back</ThemedText>
                    </Pressable>
                </View>
            </>
        );
    }

    return (
        <>
            <View style={styles.identity}>
                <ThemedText type="figureLarge">
                    Hand these over first
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    You are the only owner of{' '}
                    {families.length === 1 ? 'this family' : 'these families'},
                    and other people are still in{' '}
                    {families.length === 1 ? 'it' : 'them'}. Make somebody else
                    an owner and your account can go.
                </ThemedText>
            </View>

            <View>
                <SectionLabel label="Families" count={families.length} />
                {families.map((family) => (
                    <Pressable
                        key={family.id}
                        onPress={() => openFamily(family)}
                        disabled={busy}
                        accessibilityLabel={`Choose an owner for ${family.name}`}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.row,
                            { borderBottomColor: `${theme.text}17` },
                            pressed && { opacity: 0.6 },
                        ]}>
                        <ThemedText type="default" style={styles.rowLabel}>
                            {family.name}
                        </ThemedText>
                        <SymbolView
                            name={{
                                ios: 'chevron.right',
                                web: 'chevron_right',
                            }}
                            tintColor={theme.textSecondary}
                            size={12}
                        />
                    </Pressable>
                ))}
            </View>

            {error && (
                <ThemedText type="small" style={{ color: theme.destructive }}>
                    {error}
                </ThemedText>
            )}

            <View style={styles.actions}>
                <Pressable
                    onPress={onCancel}
                    disabled={busy}
                    accessibilityRole="button">
                    <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                </Pressable>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    identity: {
        gap: Spacing.one,
    },
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
    /** The sheet is centred, so a long list gives way rather than pushing it off. */
    scroll: {
        flexGrow: 0,
        maxHeight: 280,
    },
    scrollContent: {
        paddingBottom: Spacing.two,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    rowLabel: {
        flex: 1,
        minWidth: 0,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.four,
        paddingTop: Spacing.two,
    },
});
