import { SymbolView } from 'expo-symbols';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MemberAvatar } from '@/components/member-avatar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dayOf, daysUntil, formatCompactDateString } from '@/constants/dates';
import { MAX_URL_LENGTH } from '@/constants/limits';
import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { type SharedLinkItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { SharedLinksProvider, useSharedLinks } from '@/hooks/use-shared-links';
import { useTheme } from '@/hooks/use-theme';

import { byNewest, linkHost } from '@/utils/shared-link';

interface SharedLinkRowProps {
    sharedLink: SharedLinkItem;
    canManage: boolean;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const SharedLinkRow = React.memo(
    ({
        sharedLink,
        canManage,
        onOpen,
        onEdit,
        onDelete,
        theme,
    }: SharedLinkRowProps) => {
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

        const keeper = members.find((m) => m.id === sharedLink.createdBy);

        return (
            <Swipeable
                ref={swipeableRef}
                friction={2}
                rightThreshold={40}
                renderRightActions={canManage ? renderRightActions : undefined}
                containerStyle={styles.swipeableContainer}>
                <Pressable
                    onPress={onOpen}
                    accessibilityLabel={`Open ${sharedLink.title}`}
                    accessibilityRole="link"
                    style={({ pressed }) => [
                        styles.row,
                        { borderBottomColor: `${theme.text}17` },
                        pressed && { opacity: 0.6 },
                    ]}>
                    <View style={styles.rowTextColumn}>
                        <ThemedText type="small">{sharedLink.title}</ThemedText>
                        <ThemedText
                            style={[styles.host, { color: theme.link }]}
                            numberOfLines={1}>
                            {linkHost(sharedLink.url)}
                        </ThemedText>
                        {sharedLink.note && (
                            <ThemedText
                                type="note"
                                themeColor="textMuted"
                                style={styles.note}>
                                {sharedLink.note}
                            </ThemedText>
                        )}
                    </View>

                    <View style={styles.rowAside}>
                        {keeper && <MemberAvatar member={keeper} size={24} />}
                        <ThemedText type="labelSmall" themeColor="textMuted">
                            {formatCompactDateString(
                                dayOf(sharedLink.createdAt)
                            )}
                        </ThemedText>
                    </View>
                </Pressable>
            </Swipeable>
        );
    }
);

SharedLinkRow.displayName = 'SharedLinkRow';

/** Where the list divides: what somebody dropped in this week, and the pile. */
const ThisWeekDays = 7;

function keptThisWeek(sharedLink: SharedLinkItem): boolean {
    return -daysUntil(dayOf(sharedLink.createdAt)) < ThisWeekDays;
}

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

function SharedLinks() {
    const theme = useTheme();
    const {
        sharedLinks,
        loading,
        error,
        clearError,
        addSharedLink,
        editSharedLink,
        deleteSharedLink,
    } = useSharedLinks();
    const { members } = useMembers();
    const { member: me } = useFamily();
    const { canManageContent } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<SharedLinkItem | null>(null);

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [note, setNote] = useState('');
    const [createdBy, setCreatedBy] = useState<string | undefined>(undefined);

    const listed = [...sharedLinks].sort(byNewest);
    const thisWeek = listed.filter(keptThisWeek);
    const earlier = listed.filter((one) => !keptThisWeek(one));
    const complete = title.trim().length > 0 && url.trim().length > 0;

    const openAddModal = () => {
        setEditing(null);
        setTitle('');
        setUrl('');
        setNote('');
        setCreatedBy(me?.id);
        clearError();
        setModalVisible(true);
    };

    const openEditModal = (sharedLink: SharedLinkItem) => {
        setEditing(sharedLink);
        setTitle(sharedLink.title);
        setUrl(sharedLink.url);
        setNote(sharedLink.note ?? '');
        setCreatedBy(sharedLink.createdBy ?? undefined);
        clearError();
        setModalVisible(true);
    };

    const closeModal = () => {
        clearError();
        setModalVisible(false);
    };

    const save = async () => {
        if (!complete) return;

        const input = {
            title: title.trim(),
            url: url.trim(),
            note: note.trim() || null,
            createdBy,
        };

        const saved = editing
            ? await editSharedLink(editing.id, input)
            : await addSharedLink(input);

        if (saved) setModalVisible(false);
    };

    const renderRow = (sharedLink: SharedLinkItem) => (
        <SharedLinkRow
            key={sharedLink.id}
            sharedLink={sharedLink}
            theme={theme}
            canManage={canManageContent}
            onOpen={() => Linking.openURL(sharedLink.url)}
            onEdit={() => openEditModal(sharedLink)}
            onDelete={() => deleteSharedLink(sharedLink.id)}
        />
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader
                    title="Shared Links"
                    subtitle={loading ? undefined : 'Newest first'}
                    figure={
                        loading
                            ? undefined
                            : { value: `${listed.length}`, label: 'Kept' }
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
                            {loading ? '' : 'No links kept yet.'}
                        </ThemedText>
                    ) : (
                        <>
                            {thisWeek.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="This week"
                                        count={thisWeek.length}
                                    />
                                    {thisWeek.map(renderRow)}
                                </>
                            )}
                            {earlier.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Earlier"
                                        count={earlier.length}
                                    />
                                    {earlier.map(renderRow)}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                {canManageContent && (
                    <View style={styles.addButtonContainer}>
                        <Pressable
                            onPress={openAddModal}
                            accessibilityLabel="Add link"
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
                                Add link
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
                                {editing ? 'Edit Link' : 'Add Link'}
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
                                Title
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
                                placeholder="What it is..."
                                placeholderTextColor={theme.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                accessibilityLabel="Title"
                            />

                            <ThemedText style={styles.modalLabel}>
                                Link
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
                                placeholder="https://"
                                placeholderTextColor={theme.textSecondary}
                                value={url}
                                onChangeText={setUrl}
                                maxLength={MAX_URL_LENGTH}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                accessibilityLabel="Link"
                            />

                            <ThemedText style={styles.modalLabel}>
                                Note
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
                                placeholder="What it is for..."
                                placeholderTextColor={theme.textSecondary}
                                value={note}
                                onChangeText={setNote}
                                accessibilityLabel="Note"
                            />

                            <ThemedText style={styles.modalLabel}>
                                Who kept it
                            </ThemedText>
                            <View style={styles.keeperList}>
                                {members.map((member) => {
                                    const isSelected = createdBy === member.id;
                                    return (
                                        <Pressable
                                            key={member.id}
                                            onPress={() =>
                                                setCreatedBy(
                                                    isSelected
                                                        ? undefined
                                                        : member.id
                                                )
                                            }
                                            accessibilityLabel={`Kept by ${member.name}`}
                                            accessibilityRole="button"
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                            style={[
                                                styles.keeperRow,
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
                                                style={styles.keeperName}>
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
                                accessibilityLabel="Save link"
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
                    </SafeAreaView>
                </View>
            </Modal>
        </ThemedView>
    );
}

export default function SharedLinksScreen() {
    return (
        <SharedLinksProvider>
            <SharedLinks />
        </SharedLinksProvider>
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
        paddingBottom: Spacing.one,
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
        alignItems: 'flex-start',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
    },
    rowTextColumn: {
        flex: 1,
        minWidth: 0,
    },
    host: {
        fontFamily: Fonts.sansMedium,
        fontSize: 11.5,
        lineHeight: 15,
        marginTop: Spacing.one,
    },
    note: {
        marginTop: Spacing.one,
    },
    rowAside: {
        alignItems: 'flex-end',
        gap: Spacing.two,
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
    keeperList: {
        gap: Spacing.two,
    },
    keeperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderRadius: 12,
        borderWidth: 2,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    keeperName: {
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
