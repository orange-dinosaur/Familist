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
import {
    daysUntil,
    formatShortDateString,
    getRelativeDateString,
} from '@/constants/dates';
import {
    Colors,
    Fonts,
    MaxContentWidth,
    Spacing,
    type ThemeColor,
} from '@/constants/theme';
import { type ActivityItem } from '@/constants/types';
import { ActivitiesProvider, useActivities } from '@/hooks/use-activities';
import { useMembers } from '@/hooks/use-members';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { byLastDone } from '@/utils/activity';

/**
 * Where the list divides. Nothing on an activity says how often it should
 * happen, so this describes how long it has been rather than judging it: the
 * family decides for itself whether a month is too long for a given thing.
 */
const LongAgoDays = 30;

/** Whole days since an activity was last done, or null if it never was. */
function daysSince(activity: ActivityItem): number | null {
    return activity.lastDoneOn ? -daysUntil(activity.lastDoneOn) : null;
}

/** The figure turns once a thing has gone a month, and never-done counts. */
function ageTone(activity: ActivityItem): ThemeColor {
    const days = daysSince(activity);
    return days === null || days >= LongAgoDays ? 'priorityHigh' : 'text';
}

type LastDone = 'notYet' | 'done';

const LAST_DONE_OPTIONS: { key: LastDone; label: string }[] = [
    { key: 'notYet', label: 'Not yet' },
    { key: 'done', label: 'Done' },
];

interface ActivityRowProps {
    activity: ActivityItem;
    canManage: boolean;
    canMark: boolean;
    onDone: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: any;
}

const ActivityRow = React.memo(
    ({
        activity,
        canManage,
        canMark,
        onDone,
        onEdit,
        onDelete,
        theme,
    }: ActivityRowProps) => {
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

        const assignee = members.find((m) => m.id === activity.assigneeId);
        const days = daysSince(activity);

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
                    <View style={styles.ageColumn}>
                        <ThemedText
                            type="figureLarge"
                            themeColor={ageTone(activity)}>
                            {days === null ? '–' : days}
                        </ThemedText>
                        <ThemedText
                            type="labelSmall"
                            themeColor="textMuted"
                            style={styles.ageCaption}>
                            {days === null ? 'never' : 'days'}
                        </ThemedText>
                    </View>

                    <View style={styles.rowTextColumn}>
                        <ThemedText type="small">
                            {activity.emoji
                                ? `${activity.emoji} ${activity.name}`
                                : activity.name}
                        </ThemedText>
                        <ThemedText
                            themeColor="textMuted"
                            style={styles.rowWhen}>
                            {activity.lastDoneOn
                                ? `Last done ${formatShortDateString(activity.lastDoneOn, true)}${assignee ? ` by ${assignee.name}` : ''}`
                                : 'Not done yet'}
                        </ThemedText>
                    </View>

                    {assignee && <MemberAvatar member={assignee} size={22} />}

                    {canMark && (
                        <Pressable
                            onPress={onDone}
                            accessibilityLabel={`Mark ${activity.name} done`}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.doneButton,
                                { borderColor: `${theme.text}29` },
                                pressed && { opacity: 0.6 },
                            ]}>
                            <ThemedText type="labelSmall">Done</ThemedText>
                        </Pressable>
                    )}
                </View>
            </Swipeable>
        );
    }
);

ActivityRow.displayName = 'ActivityRow';

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

function WhenDidILast() {
    const theme = useTheme();
    const {
        activities,
        loading,
        error,
        clearError,
        addActivity,
        editActivity,
        markDone,
        deleteActivity,
    } = useActivities();
    const { canManageContent, canToggle } = usePermissions();

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<ActivityItem | null>(null);
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
    const [lastDoneOn, setLastDoneOn] = useState<string | null>(null);

    const listed = [...activities].sort(byLastDone);
    /** Never done sits with the long-ago ones, which is what never amounts to. */
    const longAgo = listed.filter((one) => {
        const days = daysSince(one);
        return days === null || days >= LongAgoDays;
    });
    const recently = listed.filter((one) => {
        const days = daysSince(one);
        return days !== null && days < LongAgoDays;
    });

    const openAddModal = () => {
        setEditing(null);
        setName('');
        setEmoji('');
        setAssigneeId(undefined);
        setLastDoneOn(null);
        clearError();
        setModalVisible(true);
    };

    const openEditModal = (activity: ActivityItem) => {
        setEditing(activity);
        setName(activity.name);
        setEmoji(activity.emoji);
        setAssigneeId(activity.assigneeId ?? undefined);
        setLastDoneOn(activity.lastDoneOn);
        clearError();
        setModalVisible(true);
    };

    const closeModal = () => {
        clearError();
        setModalVisible(false);
    };

    /** Done starts on today, and the day row below can move it. */
    const chooseLastDone = (key: LastDone) => {
        if (key === 'notYet') setLastDoneOn(null);
        else if (lastDoneOn === null) setLastDoneOn(getRelativeDateString(0));
    };

    const save = async () => {
        if (!name.trim()) return;

        const input = {
            name: name.trim(),
            emoji,
            assigneeId,
            lastDoneOn,
        };

        const saved = editing
            ? await editActivity(editing.id, input)
            : await addActivity(input);

        if (saved) setModalVisible(false);
    };

    const renderRow = (activity: ActivityItem) => (
        <ActivityRow
            key={activity.id}
            activity={activity}
            theme={theme}
            canManage={canManageContent}
            canMark={canToggle(activity.assigneeId)}
            onDone={() => markDone(activity.id)}
            onEdit={() => openEditModal(activity)}
            onDelete={() => deleteActivity(activity.id)}
        />
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader
                    title="When Did I Last"
                    subtitle={
                        loading
                            ? undefined
                            : `${activities.length} ${activities.length === 1 ? 'thing' : 'things'} tracked`
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
                            {loading ? '' : 'Nothing to keep track of yet.'}
                        </ThemedText>
                    ) : (
                        <>
                            {longAgo.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Over a month ago"
                                        count={longAgo.length}
                                    />
                                    {longAgo.map(renderRow)}
                                </>
                            )}
                            {recently.length > 0 && (
                                <>
                                    <SectionHeading
                                        label="Recently"
                                        count={recently.length}
                                    />
                                    {recently.map(renderRow)}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                {canManageContent && (
                    <View style={styles.addButtonContainer}>
                        <Pressable
                            onPress={openAddModal}
                            accessibilityLabel="Add activity"
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
                                Log something done
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </SafeAreaView>

            <FormSheet
                visible={modalVisible}
                title={editing ? 'Edit activity' : 'Add an activity'}
                onClose={closeModal}
                actionLabel="Save"
                onAction={save}
                actionDisabled={!name.trim()}
                error={error}>
                <View style={styles.nameRow}>
                    <EmojiField
                        placeholder="🪴"
                        value={emoji}
                        onChangeText={setEmoji}
                    />
                    <View style={styles.nameField}>
                        <FormField
                            label="Name"
                            placeholder="Water the plants..."
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                </View>

                <MemberPicker
                    label="Whose it is"
                    chosenId={assigneeId}
                    onChoose={(id) =>
                        setAssigneeId(assigneeId === id ? undefined : id)
                    }
                />

                {/* Something already done once starts with its day. */}
                <OptionTabs
                    label="Last done"
                    options={LAST_DONE_OPTIONS}
                    chosen={lastDoneOn === null ? 'notYet' : 'done'}
                    onChoose={chooseLastDone}
                />
                {lastDoneOn !== null && (
                    <DateRow
                        label="Day"
                        day={lastDoneOn}
                        onChange={setLastDoneOn}
                    />
                )}
            </FormSheet>
        </ThemedView>
    );
}

export default function WhenDidILastScreen() {
    return (
        <ActivitiesProvider>
            <WhenDidILast />
        </ActivitiesProvider>
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
    ageColumn: {
        width: 46,
        flexShrink: 0,
        alignItems: 'center',
    },
    ageCaption: {
        marginTop: Spacing.half,
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
    doneButton: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
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
