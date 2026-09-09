import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFamily } from '@/hooks/use-family';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'create' | 'join';

const Points = [
    {
        title: 'One shared day',
        body: 'Meals, chores and to-dos for today, on one screen.',
    },
    {
        title: 'Everyone has a colour',
        body: 'Every task carries the initial of the person it belongs to.',
    },
    {
        title: 'The dull essentials',
        body: 'Subscriptions, payments and the things nobody remembers doing.',
    },
];

export default function WelcomeScreen() {
    const theme = useTheme();
    const scheme = useColorScheme();
    const { createFamily, joinFamily } = useFamily();

    const [stage, setStage] = useState<'intro' | 'form'>('intro');
    const [mode, setMode] = useState<Mode>('create');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const joining = mode === 'join';
    const canSubmit = joining ? code.trim().length > 0 : name.trim().length > 0;

    const submit = async () => {
        if (!canSubmit || pending) return;
        setPending(true);
        setError(null);

        const message = joining
            ? await joinFamily(code.trim())
            : await createFamily(name.trim());

        setPending(false);
        if (message) setError(message);
    };

    const begin = (next: Mode) => {
        setMode(next);
        setStage('form');
    };

    const back = () => {
        if (pending) return;
        setError(null);
        setStage('intro');
    };

    const lockup = (
        <Image
            source={
                scheme === 'dark'
                    ? require('@/assets/images/familist-lockup-verde.svg')
                    : require('@/assets/images/familist-lockup-chiaro.svg')
            }
            style={styles.lockup}
            contentFit="contain"
            accessibilityLabel="FamiList"
        />
    );

    if (stage === 'intro') {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.content}>
                        <View style={styles.head}>
                            {lockup}
                            <ThemedText type="heading" style={styles.headline}>
                                Meals, chores and the small stuff, in one place.
                            </ThemedText>
                            <ThemedText
                                type="small"
                                themeColor="textSecondary"
                                style={styles.subhead}>
                                Everyone in the house sees the same plan, and
                                who it belongs to.
                            </ThemedText>
                        </View>

                        <View style={styles.points}>
                            {Points.map((point, index) => (
                                <View
                                    key={point.title}
                                    style={[
                                        styles.point,
                                        { borderTopColor: `${theme.text}29` },
                                    ]}>
                                    <ThemedText
                                        type="figure"
                                        themeColor="memberSage"
                                        style={styles.pointNumber}>
                                        {index + 1}
                                    </ThemedText>
                                    <View style={styles.pointText}>
                                        <ThemedText type="smallBold">
                                            {point.title}
                                        </ThemedText>
                                        <ThemedText
                                            type="small"
                                            themeColor="textSecondary">
                                            {point.body}
                                        </ThemedText>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.spacer} />

                        <View style={styles.introFoot}>
                            <Pressable
                                onPress={() => begin('create')}
                                accessibilityLabel="Create a family"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.introButton,
                                    { backgroundColor: theme.text },
                                    pressed && { opacity: 0.8 },
                                ]}>
                                <ThemedText
                                    type="smallBold"
                                    style={{ color: theme.background }}>
                                    Create a family
                                </ThemedText>
                            </Pressable>

                            <Pressable
                                onPress={() => begin('join')}
                                accessibilityLabel="I have an invite code"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.introButton,
                                    styles.introButtonOutlined,
                                    { borderColor: theme.text },
                                    pressed && { opacity: 0.8 },
                                ]}>
                                <ThemedText type="smallBold">
                                    I have an invite code
                                </ThemedText>
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.head}>
                        {lockup}
                        <ThemedText type="heading" style={styles.headline}>
                            {joining
                                ? 'Join your family'
                                : 'Set up your family'}
                        </ThemedText>
                        <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            style={styles.subhead}>
                            {joining
                                ? 'Enter the code you were sent.'
                                : 'Give it a name. You can add everyone else afterwards.'}
                        </ThemedText>
                    </View>

                    <View style={styles.form}>
                        <View
                            style={[
                                styles.field,
                                { borderBottomColor: `${theme.text}24` },
                            ]}>
                            <ThemedText type="label" themeColor="textSecondary">
                                {joining ? 'Invite code' : 'Family name'}
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    { color: theme.text },
                                ]}
                                placeholder={
                                    joining ? 'ABCD234XYZ' : 'The Rossis'
                                }
                                placeholderTextColor={theme.textMuted}
                                value={joining ? code : name}
                                onChangeText={joining ? setCode : setName}
                                autoCapitalize={
                                    joining ? 'characters' : 'sentences'
                                }
                                autoCorrect={!joining}
                                onSubmitEditing={submit}
                                accessibilityLabel={
                                    joining ? 'Invite code' : 'Family name'
                                }
                            />
                        </View>
                    </View>

                    {error && (
                        <ThemedText
                            type="small"
                            style={{ color: theme.destructive }}>
                            {error}
                        </ThemedText>
                    )}

                    <Pressable
                        onPress={submit}
                        disabled={!canSubmit || pending}
                        accessibilityLabel={
                            joining ? 'Join family' : 'Create family'
                        }
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.submitButton,
                            {
                                backgroundColor:
                                    canSubmit && !pending
                                        ? theme.text
                                        : theme.backgroundElement,
                            },
                            pressed && { opacity: 0.8 },
                        ]}>
                        {pending ? (
                            <ActivityIndicator color={theme.textSecondary} />
                        ) : (
                            <ThemedText
                                type="smallBold"
                                style={{
                                    color: canSubmit
                                        ? theme.background
                                        : theme.textSecondary,
                                }}>
                                {joining ? 'Join family' : 'Create family'}
                            </ThemedText>
                        )}
                    </Pressable>

                    <View style={styles.spacer} />

                    <View
                        style={[
                            styles.footer,
                            { borderTopColor: `${theme.text}24` },
                        ]}>
                        <Pressable
                            onPress={back}
                            accessibilityLabel="Back"
                            accessibilityRole="button">
                            <ThemedText type="smallBold">Back</ThemedText>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
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
    content: {
        flex: 1,
        paddingHorizontal: Spacing.four,
        gap: Spacing.two,
    },
    introFoot: {
        gap: Spacing.two,
        paddingBottom: Spacing.four,
    },
    head: {
        paddingTop: Spacing.five,
    },
    /** The lockup's artwork is 168 by 37, and it is drawn at its own size. */
    lockup: {
        width: 168,
        height: 37,
    },
    headline: {
        marginTop: Spacing.four,
        maxWidth: 272,
    },
    subhead: {
        marginTop: Spacing.three,
        maxWidth: 280,
    },
    points: {
        paddingTop: Spacing.four,
    },
    point: {
        flexDirection: 'row',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        borderTopWidth: 1,
    },
    pointNumber: {
        width: 18,
    },
    pointText: {
        flex: 1,
        gap: Spacing.one,
    },
    spacer: {
        flex: 1,
    },
    introButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: Spacing.three,
    },
    /** The border is inside the box, so the padding gives its width back. */
    introButtonOutlined: {
        borderWidth: 1.5,
        padding: Spacing.three - 1.5,
    },
    form: {
        paddingTop: Spacing.five,
    },
    field: {
        gap: Spacing.two,
        paddingBottom: Spacing.two,
        marginBottom: Spacing.four,
        borderBottomWidth: 1,
    },
    textInput: {
        fontFamily: Fonts.sansMedium,
        fontSize: 16,
        paddingVertical: Spacing.one,
    },
    submitButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: Spacing.three,
        marginTop: Spacing.two,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingTop: Spacing.four,
        paddingBottom: Spacing.three,
        borderTopWidth: 1,
    },
});
