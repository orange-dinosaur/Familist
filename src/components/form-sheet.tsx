import { SymbolView } from 'expo-symbols';
import React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    type TextInputProps,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MemberAvatar } from './member-avatar';
import { ThemedText } from './themed-text';

import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useMembers } from '@/hooks/use-members';
import { useTheme } from '@/hooks/use-theme';

interface FormSheetProps {
    visible: boolean;
    title: string;
    onClose: () => void;
    /** The footer button, which stays greyed out while `actionDisabled`. */
    actionLabel: string;
    onAction: () => void;
    actionDisabled?: boolean;
    error?: string | null;
    children: React.ReactNode;
}

/**
 * The full-height sheet that adds or edits one item. On the web it stops at the
 * same width as the screens, with the page colour filling the rest of the window.
 */
export function FormSheet({
    visible,
    title,
    onClose,
    actionLabel,
    onAction,
    actionDisabled = false,
    error,
    children,
}: FormSheetProps) {
    const theme = useTheme();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}>
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <ThemedText type="figureLarge">{title}</ThemedText>
                        <Pressable
                            onPress={onClose}
                            hitSlop={8}
                            accessibilityLabel="Close"
                            accessibilityRole="button">
                            <SymbolView
                                name={{ ios: 'xmark', web: 'close' }}
                                tintColor={theme.textSecondary}
                                size={16}
                            />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled">
                        {children}
                    </ScrollView>

                    <View style={styles.footer}>
                        {error && (
                            <ThemedText
                                type="small"
                                style={{ color: theme.destructive }}>
                                {error}
                            </ThemedText>
                        )}
                        <Pressable
                            onPress={onAction}
                            disabled={actionDisabled}
                            accessibilityLabel={actionLabel}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.action,
                                {
                                    backgroundColor: actionDisabled
                                        ? theme.backgroundElement
                                        : theme.text,
                                },
                                pressed && { opacity: 0.8 },
                            ]}>
                            <ThemedText
                                style={[
                                    styles.actionText,
                                    {
                                        color: actionDisabled
                                            ? theme.textSecondary
                                            : theme.background,
                                    },
                                ]}>
                                {actionLabel}
                            </ThemedText>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

interface FormFieldProps extends TextInputProps {
    label: string;
}

/** A labelled text field, drawn as a single rule under what is typed. */
export function FormField({ label, style, ...input }: FormFieldProps) {
    const theme = useTheme();

    return (
        <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
                {label}
            </ThemedText>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={theme.textSecondary}
                {...input}
                style={[
                    styles.input,
                    {
                        borderBottomColor: `${theme.text}29`,
                        color: theme.text,
                    },
                    style,
                ]}
            />
        </View>
    );
}

interface ChoiceRowProps {
    label: string;
    chosen: boolean;
    onPress: () => void;
    /** Drawn before the label, such as a member's avatar. */
    leading?: React.ReactNode;
    accessibilityLabel?: string;
}

/** One option in a list, with a rule under it and a ✓ on the chosen one. */
export function ChoiceRow({
    label,
    chosen,
    onPress,
    leading,
    accessibilityLabel,
}: ChoiceRowProps) {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            style={({ pressed }) => [
                styles.choice,
                { borderBottomColor: `${theme.text}17` },
                pressed && { opacity: 0.6 },
            ]}>
            {leading}
            <ThemedText style={styles.choiceLabel}>{label}</ThemedText>
            {chosen && (
                <SymbolView
                    name={{ ios: 'checkmark', web: 'check' }}
                    tintColor={theme.text}
                    size={18}
                />
            )}
        </Pressable>
    );
}

interface MemberPickerProps {
    label: string;
    chosenId?: string;
    onChoose: (memberId: string) => void;
}

/** A labelled list of the family, one row per member with their avatar. */
export function MemberPicker({ label, chosenId, onChoose }: MemberPickerProps) {
    const { members } = useMembers();

    return (
        <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
                {label}
            </ThemedText>
            <View>
                {members.map((member) => (
                    <ChoiceRow
                        key={member.id}
                        label={member.name}
                        accessibilityLabel={`${label}: ${member.name}`}
                        chosen={member.id === chosenId}
                        onPress={() => onChoose(member.id)}
                        leading={<MemberAvatar member={member} size={34} />}
                    />
                ))}
            </View>
        </View>
    );
}

interface OptionTabsProps<T extends string> {
    label: string;
    options: readonly { key: T; label: string }[];
    chosen: T;
    onChoose: (key: T) => void;
}

/** A labelled choice between a few options, drawn as tabs on a rule. */
export function OptionTabs<T extends string>({
    label,
    options,
    chosen,
    onChoose,
}: OptionTabsProps<T>) {
    const theme = useTheme();

    return (
        <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
                {label}
            </ThemedText>
            <View
                style={[styles.tabs, { borderBottomColor: `${theme.text}24` }]}>
                {options.map((option) => {
                    const isChosen = option.key === chosen;
                    return (
                        <Pressable
                            key={option.key}
                            onPress={() => onChoose(option.key)}
                            accessibilityLabel={`${label}: ${option.label}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isChosen }}
                            style={styles.tab}>
                            <ThemedText
                                type="label"
                                themeColor={
                                    isChosen ? 'text' : 'textSecondary'
                                }>
                                {option.label}
                            </ThemedText>
                            <View
                                style={[
                                    styles.tabMark,
                                    isChosen && { backgroundColor: theme.text },
                                ]}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two,
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
    },
    footer: {
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        gap: Spacing.two,
    },
    action: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: Spacing.three,
    },
    actionText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 13.5,
        lineHeight: 18,
    },
    field: {
        paddingTop: Spacing.three,
        gap: Spacing.two,
    },
    input: {
        height: 44,
        borderBottomWidth: 1,
        fontFamily: Fonts.sansMedium,
        fontSize: 15,
    },
    choice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    choiceLabel: {
        flex: 1,
    },
    tabs: {
        flexDirection: 'row',
        gap: Spacing.four,
        borderBottomWidth: 1,
    },
    tab: {
        alignItems: 'center',
    },
    /** The mark under the chosen option. */
    tabMark: {
        height: 2,
        alignSelf: 'stretch',
        marginTop: Spacing.two + Spacing.one,
    },
});
